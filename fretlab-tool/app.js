import { getNoteIndex, getNoteName, getPositionNoteIndex, spellNoteFromRootAndDegree } from "./theory.js";
import { SCALE_SHAPES as GUITAR_SCALE_SHAPES } from "./shapes.js";
import { getTabPositionsFromMidi, pickBestTabPosition } from "./plugins/shared/realtime-mapping.js";
import {
  hasFretlabFullAccess,
  isFretlabLicenseStorageKey,
} from "./access-control.js";

const state = {
  language: "zh",
  instrumentId: "guitar",
  customInstrumentConfig: null,
  guitarTone: "classical",
  labelMode: "fixed",
  movableDoRoot: 0,
  paletteOpen: false,
  exportMenuOpen: false,
  customInstrumentModalOpen: false,
  videoModalOpen: false,
  helpModalOpen: false,
  boardCount: 1,
  activeBoardIndex: 0,
  fretCount: 12,
  fretStart: 1,
  hasCustomFretRange: false,
  fretboardOrientation: 0,
  notePreference: "sharps",
  boardStates: [{ markers: {}, selectedId: null, selectedIds: [] }],
  isFullAccess: false,
};

const dom = {
  boardPanel: document.querySelector(".board-panel"),
  boardFretboard: document.querySelector(".board-panel__fretboard"),
  boardInlineControls: document.querySelector(".board-inline-controls"),
  mobileBoardInlineControlsSlot: document.getElementById("mobileBoardInlineControlsSlot"),
  svg: document.getElementById("fretboardSvg"),
  fretboardStack: document.getElementById("fretboardStack"),
  markerHint: document.getElementById("markerCountHint"),
  boardCountInput: document.getElementById("boardCountInput"),
  fretStartInput: document.getElementById("fretStartInput"),
  fretEndInput: document.getElementById("fretEndInput"),
  notePreferenceSelect: document.getElementById("notePreferenceSelect"),
  labelModeSelect: document.getElementById("labelModeSelect"),
  movableDoRootWrap: document.getElementById("movableDoRootWrap"),
  movableDoRootSelect: document.getElementById("movableDoRootSelect"),
  exportToggleBtn: document.getElementById("exportToggleBtn"),
  exportMenu: document.getElementById("exportMenu"),
  videoRenderBtn: document.getElementById("videoRenderBtn"),
  helpToggleBtn: document.getElementById("helpToggleBtn"),
  clearBtn: document.getElementById("clearMarkersBtn"),
  flipBoardBtn: document.getElementById("flipBoardBtn"),
  addBoardBtn: document.getElementById("addBoardBtn"),
  removeBoardBtn: document.getElementById("removeBoardBtn"),
  shapeLibrary: document.getElementById("shapeLibrary"),
  overlayList: document.getElementById("overlayList"),
  clearOverlaysBtn: document.getElementById("clearOverlaysBtn"),
  recordShapeStartBtn: document.getElementById("recordShapeStartBtn"),
  recordShapeCancelBtn: document.getElementById("recordShapeCancelBtn"),
  recordShapeExportBtn: document.getElementById("recordShapeExportBtn"),
  recordShapeCopyBtn: document.getElementById("recordShapeCopyBtn"),
  recordShapeStatus: document.getElementById("recordShapeStatus"),
  recordShapeNameInput: document.getElementById("recordShapeNameInput"),
  recordShapeModeInput: document.getElementById("recordShapeModeInput"),
  recordShapeSystemInput: document.getElementById("recordShapeSystemInput"),
  recordShapeCollectionInput: document.getElementById("recordShapeCollectionInput"),
  recordShapeMarkerList: document.getElementById("recordShapeMarkerList"),
  recordShapeWarnings: document.getElementById("recordShapeWarnings"),
  recordShapeOutput: document.getElementById("recordShapeOutput"),
  languageSwitch: document.getElementById("languageSwitch"),
  instrumentSelect: document.getElementById("instrumentSelect"),
  customInstrumentEditBtn: document.getElementById("customInstrumentEditBtn"),
  guitarToneWrap: document.getElementById("guitarToneWrap"),
  guitarToneSelect: document.getElementById("guitarToneSelect"),
  customInstrumentModal: document.getElementById("customInstrumentModal"),
  customInstrumentModalBackdrop: document.getElementById("customInstrumentModalBackdrop"),
  customInstrumentModalCloseBtn: document.getElementById("customInstrumentModalCloseBtn"),
  customStringCountInput: document.getElementById("customStringCountInput"),
  customIntervalPresetSelect: document.getElementById("customIntervalPresetSelect"),
  customIntervalFields: document.getElementById("customIntervalFields"),
  customTuningFields: document.getElementById("customTuningFields"),
  customInstrumentStatus: document.getElementById("customInstrumentStatus"),
  customInstrumentCancelBtn: document.getElementById("customInstrumentCancelBtn"),
  customInstrumentSaveBtn: document.getElementById("customInstrumentSaveBtn"),
  paletteToggleBtn: document.getElementById("paletteToggleBtn"),
  paletteCloseBtn: document.getElementById("paletteCloseBtn"),
  paletteDrawer: document.getElementById("shapePaletteDrawer"),
  paletteBackdrop: document.getElementById("paletteBackdrop"),
  licenseStatusBanner: document.getElementById("licenseStatusBanner"),
  videoModal: document.getElementById("videoRenderModal"),
  videoModalBackdrop: document.getElementById("videoModalBackdrop"),
  videoModalCloseBtn: document.getElementById("videoModalCloseBtn"),
  videoDropZone: document.getElementById("videoDropZone"),
  videoUploadInput: document.getElementById("videoUploadInput"),
  videoProgressWrap: document.getElementById("videoProgressWrap"),
  videoProgressBar: document.getElementById("videoProgressBar"),
  videoProgressText: document.getElementById("videoProgressText"),
  videoCancelBtn: document.getElementById("videoCancelBtn"),
  videoGenerateBtn: document.getElementById("videoGenerateBtn"),
  videoRenderStatus: document.getElementById("videoRenderStatus"),
  helpModal: document.getElementById("helpModal"),
  helpModalBackdrop: document.getElementById("helpModalBackdrop"),
  helpModalCloseBtn: document.getElementById("helpModalCloseBtn"),
};

const UI_LANGUAGE_STORAGE_KEY = "ic_fretlab_ui_language";
const INSTRUMENT_STORAGE_KEY = "ic_fretlab_instrument";
const CUSTOM_INSTRUMENT_STORAGE_KEY = "ic_fretlab_custom_instrument";
const GUITAR_TONE_STORAGE_KEY = "ic_fretlab_guitar_tone";
const LABEL_MODE_STORAGE_KEY = "ic_fretlab_label_mode";
const MOVABLE_DO_ROOT_STORAGE_KEY = "ic_fretlab_movable_do_root";
const MOBILE_LAYOUT_MEDIA_QUERY = "(max-width: 1024px)";
const UI_LANGUAGES = new Set(["zh", "zh-hant", "en"]);
const GUITAR_TONES = new Set(["classical", "folk"]);
const LABEL_MODES = new Set(["fixed", "movable-do"]);
const CUSTOM_INSTRUMENT_ID = "custom";
const INSTRUMENTS = {
  guitar: {
    id: "guitar",
    tuning: ["E", "A", "D", "G", "B", "E"],
    openMidi: [40, 45, 50, 55, 59, 64],
    sourceStringStart: 0,
    sourceStringCount: 6,
    stringSpacing: 48,
  },
  bass: {
    id: "bass",
    tuning: ["E", "A", "D", "G"],
    openMidi: [28, 33, 38, 43],
    sourceStringStart: 0,
    sourceStringCount: 4,
    stringSpacing: 72,
  },
  ukulele: {
    id: "ukulele",
    tuning: ["G", "C", "E", "A"],
    openMidi: [67, 60, 64, 69],
    sourceStringStart: 2,
    sourceStringCount: 4,
    stringSpacing: 66,
  },
};
const VALID_INSTRUMENT_IDS = new Set([...Object.keys(INSTRUMENTS), CUSTOM_INSTRUMENT_ID]);
const STANDARD_GUITAR_TUNING = [...INSTRUMENTS.guitar.tuning];
const STANDARD_GUITAR_OPEN_MIDI = [...INSTRUMENTS.guitar.openMidi];
const customInstrumentModal = {
  draftTuning: [...STANDARD_GUITAR_TUNING],
  draftIntervals: [],
  statusMessage: "",
};
const INTERVAL_OPTIONS = [
  { semitones: 1, key: "interval.m2" },
  { semitones: 2, key: "interval.M2" },
  { semitones: 3, key: "interval.m3" },
  { semitones: 4, key: "interval.M3" },
  { semitones: 5, key: "interval.P4" },
  { semitones: 6, key: "interval.TT" },
  { semitones: 7, key: "interval.P5" },
  { semitones: 8, key: "interval.m6" },
  { semitones: 9, key: "interval.M6" },
  { semitones: 10, key: "interval.m7" },
  { semitones: 11, key: "interval.M7" },
  { semitones: 12, key: "interval.P8" },
];
const UI_TEXT = {
  zh: {
    "lang.switch.aria": "语言切换",
    "palette.toggle": "Palette",
    "palette.close.aria": "关闭指型库面板",
    "app.title": "吉他指板白板",
    "board.dropHint": "拖拽指形到指板任意位置",
    "controls.title": "指板控制",
    "controls.subhead": "设置指板数量与音名偏好（± 调整品格）",
    "controls.instrument": "乐器",
    "controls.customInstrument.edit": "编辑",
    "controls.guitarTone": "吉他音色",
    "controls.boardCount": "指板数量",
    "controls.fretStart": "起始品位",
    "controls.fretEnd": "结束品位",
    "controls.fretCount": "品格数量",
    "controls.fretAdjust.aria": "品格增减",
    "controls.fretAdjust.decrease": "减少品格",
    "controls.fretAdjust.increase": "增加品格",
    "controls.notePreference": "音名偏好",
    "controls.notePreference.sharps": "升号",
    "controls.notePreference.flats": "降号",
    "controls.labelMode": "音名模式",
    "controls.labelMode.fixed": "固定调",
    "controls.labelMode.movableDo": "首调",
    "controls.movableDoRoot": "主音",
    "controls.tool.pointer": "鼠标模式",
    "controls.tool.select": "框选模式",
    "controls.clearMarkers": "清除",
    "controls.flipBoard": "旋转",
    "instrument.guitar": "吉他",
    "instrument.bass": "贝斯",
    "instrument.ukulele": "尤克里里",
    "instrument.custom": "自定义",
    "guitarTone.classical": "古典吉他",
    "guitarTone.folk": "民谣吉他",
    "customInstrument.modal.title": "自定义指板",
    "customInstrument.modal.close": "关闭自定义指板弹窗",
    "customInstrument.modal.cancel": "取消",
    "customInstrument.modal.save": "应用",
    "customInstrument.stringCount": "弦的数量",
    "customInstrument.tuningHint": "请按从低音弦到高音弦的顺序填写定音",
    "customInstrument.intervalTitle": "弦间音程",
    "customInstrument.intervalPreset.custom": "自定义",
    "customInstrument.intervalPreset.allFourths": "全部完全四度",
    "customInstrument.intervalPreset.allFifths": "全部完全五度",
    "customInstrument.intervalPreset.allMajorThirds": "全部大三度",
    "customInstrument.intervalPreset.allMinorThirds": "全部小三度",
    "customInstrument.intervalLabel": "{from}弦 -> {to}弦",
    "customInstrument.stringLabel": "{string}弦",
    "customInstrument.notePlaceholder": "例如：F# / Bb",
    "customInstrument.error.invalidStringCount": "弦数必须至少为 1。",
    "customInstrument.error.invalidNote": "第 {string} 弦定音无效。请输入 A-G，并可带 # 或 b。",
    "interval.m2": "小二度",
    "interval.M2": "大二度",
    "interval.m3": "小三度",
    "interval.M3": "大三度",
    "interval.P4": "完全四度",
    "interval.TT": "增四/减五",
    "interval.P5": "完全五度",
    "interval.m6": "小六度",
    "interval.M6": "大六度",
    "interval.m7": "小七度",
    "interval.M7": "大七度",
    "interval.P8": "纯八度",
    "export.format": "导出格式",
    "export.option.png": "PNG",
    "export.option.svg": "SVG",
    "export.option.pdf": "PDF",
    "export.button": "导出",
    "export.error.unavailable": "导出失败：当前指板尚未准备好。",
    "export.error.popup": "导出 PDF 失败：浏览器拦截了弹出窗口，请允许弹窗后重试。",
    "export.error.render": "导出失败：无法渲染当前指板。",
    "video.button": "视频",
    "help.button": "帮助",
    "help.button.aria": "打开帮助弹窗",
    "help.modal.title": "快速帮助",
    "help.modal.close": "关闭帮助弹窗",
    "help.modal.intro": "这里是最常用的基础操作说明。",
    "help.modal.section.markers": "标记音符",
    "help.modal.marker.singleShort": "单击",
    "help.modal.marker.doubleShort": "双击",
    "help.modal.marker.enharmonic": "长按已有音符，可以切换同音异名的显示名称。",
    "help.modal.marker.single": "点击一下：在该位置放置一个白色音符球。",
    "help.modal.marker.double": "点击两下：在该位置放置一个黄色主音球。",
    "help.modal.marker.repeat": "再次点击已有白球可移除它；黄色主音可在多个位置同时标记。",
    "help.modal.section.shapes": "拖拽指型",
    "help.modal.shapes.palette": "点开 Palette，从指型库里把指型拖到指板上即可预览或放置。",
    "help.modal.shapes.select": "长按后拖拽，可以框选当前区域里的音符，方便一起移动或复制。",
    "help.modal.shapes.custom": "自定义指板会按当前定弦重新换算指型位置，不再强行沿用标准吉他。",
    "help.modal.section.tools": "常用工具",
    "help.modal.tools.rotate": "使用 Rotate 可以切换指板朝向。",
    "help.modal.tools.range": "Start Fret / End Fret 可以控制当前显示的品位范围。",
    "help.modal.tools.audio": "点击指板或通过 MIDI 输入时，会播放当前位置对应的音高。",
    "video.modal.title": "生成 MP4 视频",
    "video.modal.close": "关闭视频弹窗",
    "video.modal.support": "支持格式：MuseScore（.mscz / .mscx）与 Guitar Pro 5（.gp5）",
    "video.modal.maxSize": "最大文件：25MB",
    "video.modal.tip": "最佳效果建议：MuseScore 文件里请包含吉他 Tab。若仅有五线谱，指板位置可能出现偏差。",
    "video.modal.drop.hint": "拖拽文件到这里，或",
    "video.modal.upload": "选择文件",
    "video.modal.cancel": "取消",
    "video.modal.generate": "生成 MP4",
    "video.file.none": "尚未选择文件",
    "video.status.idle": "请选择 MuseScore 文件后开始生成动画。",
    "video.status.invalidType": "文件格式不支持。当前仅支持 .mscz、.mscx 或 .gp5。",
    "video.status.invalidSize": "文件过大。请上传 25MB 以内的文件。",
    "video.status.reading": "正在读取文件，请稍候…",
    "video.status.startingBridge": "正在启动本地渲染服务…",
    "video.status.rendering": "正在根据谱面生成动画与音频，请稍候…",
    "video.status.success": "MP4 已生成，正在下载。",
    "video.status.failed": "生成失败：{reason}",
    "video.status.busy": "正在生成中，请稍候完成当前任务。",
    "recorder.title": "录制指型（MVP）",
    "recorder.subhead": "在指板上点出形状，设根音锚点后导出模板",
    "recorder.start": "开始录制",
    "recorder.cancel": "取消录制",
    "recorder.export": "生成模板",
    "recorder.copy": "复制结果",
    "recorder.copyDone": "已复制",
    "recorder.status.idle": "未开始录制",
    "recorder.field.name": "名称",
    "recorder.field.mode": "模式",
    "recorder.field.system": "系统",
    "recorder.field.collection": "收编备注",
    "recorder.placeholder.name": "例如：C-Linked Position",
    "recorder.placeholder.mode": "例如：Major Scale Position",
    "recorder.placeholder.system": "例如：CAGED × 3NPS",
    "recorder.placeholder.collection": "例如：五个大调音阶",
    "recorder.markerList.title": "已标记点（点按钮设为根音锚点）",
    "recorder.output.label": "导出结果（可直接发给我收编）",
    "recorder.output.placeholder": "生成后会出现 JS 模板",
    "recorder.status.active": "录制中",
    "recorder.status.marked": "已标记 {count} 个",
    "recorder.status.recent": "最近点选：弦 {string} / 品 {fret}",
    "recorder.status.root": "根音锚点：弦 {string} / 品 {fret} ({note})",
    "recorder.emptyMarkers": "暂无标记点。先在指板上点击画出指型。",
    "recorder.rootAnchor.title": "设为根音锚点",
    "recorder.markerPill": "弦 {string} · 品 {fret} · {note}{rootTag}",
    "recorder.rootTag": " · Root",
    "recorder.warningOk": "暂无明显结构警告。",
    "recorder.exportFailHeader": "导出失败",
    "recorder.copyFailAppend": "复制失败：当前浏览器环境不允许 clipboard API，请手动复制。",
    "recorder.error.needRoot": "请先在“已标记点”里选择一个根音锚点。",
    "library.title": "指型库",
    "library.subhead": "CAGED / Pentatonic / 3NPS 完整集合",
    "library.family.scales": "音阶",
    "library.family.chords": "和弦",
    "library.ungrouped": "未分组",
    "count.items": "{count} 个",
    "overlay.empty": "暂无指形叠加，请拖拽指形到指板。",
    "overlay.meta": "{mode} · {system} · 弦 {string} · 品 {fret}",
    "overlay.action.hide": "隐藏",
    "overlay.action.show": "显示",
    "overlay.action.delete": "删除",
    "marker.hint": "标记数 <strong>{count}</strong> · 点击任意位置添加标记",
    "license.status.trial": "当前为试用版：可点击指板标记；导出、预设指型库与视频生成功能仅限完整版。前往 /fretlab/ 完成支付并验证访问码。",
    "license.status.full": "完整版已解锁：预设指型库、PNG / SVG / PDF 导出与视频生成功能可用。",
    "license.locked.export": "导出功能仅限完整版。请先在 Landing Page 完成支付并验证访问码。",
    "license.locked.library": "预设指型库仅限完整版。请先在 Landing Page 完成支付并验证访问码。",
    "license.locked.video": "视频生成功能仅限完整版。请先在 Landing Page 完成支付并验证访问码。",
    "footer.tagline": "认知吉他指板训练工具",
    "footer.copyrightPrefix": "版权所有 © 2026 · Igor Chen ·",
    "meta.title": "IC Fretboard Lab",
  },
  en: {
    "lang.switch.aria": "Language switch",
    "palette.toggle": "Palette",
    "palette.close.aria": "Close palette",
    "app.title": "Guitar Fretboard Whiteboard",
    "board.dropHint": "Drag a shape anywhere onto the fretboard",
    "controls.title": "Fretboard Controls",
    "controls.subhead": "Set board count and note labels (use +/- to adjust frets)",
    "controls.instrument": "Instrument",
    "controls.customInstrument.edit": "Edit",
    "controls.guitarTone": "Guitar Tone",
    "controls.boardCount": "Boards",
    "controls.fretStart": "Start fret",
    "controls.fretEnd": "End fret",
    "controls.fretCount": "Frets",
    "controls.fretAdjust.aria": "Fret adjustment",
    "controls.fretAdjust.decrease": "Decrease frets",
    "controls.fretAdjust.increase": "Increase frets",
    "controls.notePreference": "Note labels",
    "controls.notePreference.sharps": "Sharps",
    "controls.notePreference.flats": "Flats",
    "controls.labelMode": "Label mode",
    "controls.labelMode.fixed": "Fixed",
    "controls.labelMode.movableDo": "Movable Do",
    "controls.movableDoRoot": "Tonic",
    "controls.tool.pointer": "Pointer tool",
    "controls.tool.select": "Select tool",
    "controls.clearMarkers": "Clear",
    "controls.flipBoard": "Rotate",
    "instrument.guitar": "Guitar",
    "instrument.bass": "Bass",
    "instrument.ukulele": "Ukulele",
    "instrument.custom": "Custom",
    "guitarTone.classical": "Classical Guitar",
    "guitarTone.folk": "Folk Guitar",
    "customInstrument.modal.title": "Custom Fretboard",
    "customInstrument.modal.close": "Close custom fretboard dialog",
    "customInstrument.modal.cancel": "Cancel",
    "customInstrument.modal.save": "Apply",
    "customInstrument.stringCount": "String count",
    "customInstrument.tuningHint": "Enter tuning from lowest string to highest string",
    "customInstrument.intervalTitle": "String intervals",
    "customInstrument.intervalPreset.custom": "Custom",
    "customInstrument.intervalPreset.allFourths": "All perfect fourths",
    "customInstrument.intervalPreset.allFifths": "All perfect fifths",
    "customInstrument.intervalPreset.allMajorThirds": "All major thirds",
    "customInstrument.intervalPreset.allMinorThirds": "All minor thirds",
    "customInstrument.intervalLabel": "String {from} -> String {to}",
    "customInstrument.stringLabel": "String {string}",
    "customInstrument.notePlaceholder": "e.g. F# / Bb",
    "customInstrument.error.invalidStringCount": "String count must be at least 1.",
    "customInstrument.error.invalidNote": "Invalid tuning on string {string}. Use A-G with optional # or b.",
    "interval.m2": "m2",
    "interval.M2": "M2",
    "interval.m3": "m3",
    "interval.M3": "M3",
    "interval.P4": "P4",
    "interval.TT": "TT",
    "interval.P5": "P5",
    "interval.m6": "m6",
    "interval.M6": "M6",
    "interval.m7": "m7",
    "interval.M7": "M7",
    "interval.P8": "P8",
    "export.format": "Export format",
    "export.option.png": "PNG",
    "export.option.svg": "SVG",
    "export.option.pdf": "PDF",
    "export.button": "Export",
    "export.error.unavailable": "Export failed: fretboard is not ready yet.",
    "export.error.popup": "PDF export failed: popup was blocked by the browser.",
    "export.error.render": "Export failed: unable to render the current fretboard.",
    "video.button": "Video",
    "help.button": "Help",
    "help.button.aria": "Open help modal",
    "help.modal.title": "Quick Help",
    "help.modal.close": "Close help modal",
    "help.modal.intro": "These are the most common actions to get started.",
    "help.modal.section.markers": "Mark Notes",
    "help.modal.marker.singleShort": "Click",
    "help.modal.marker.doubleShort": "Double-click",
    "help.modal.marker.single": "Click once: place a white note marker on that spot.",
    "help.modal.marker.double": "Click twice: place a yellow root marker on that spot.",
    "help.modal.marker.repeat": "Click an existing white marker again to remove it; yellow root markers can exist on multiple spots.",
    "help.modal.section.shapes": "Drag Shapes",
    "help.modal.shapes.palette": "Open Palette, then drag a shape from the library onto the fretboard to preview or place it.",
    "help.modal.shapes.select": "Press and hold, then drag to marquee-select notes in an area so you can move or copy them together.",
    "help.modal.shapes.custom": "On a custom fretboard, shapes are recalculated against the current tuning instead of being forced into standard guitar tuning.",
    "help.modal.section.tools": "Useful Tools",
    "help.modal.tools.rotate": "Use Rotate to switch the fretboard orientation.",
    "help.modal.tools.range": "Start Fret / End Fret controls the visible fret range.",
    "help.modal.tools.audio": "Clicking the fretboard or playing through MIDI will sound the pitch for that position.",
    "video.modal.title": "Generate MP4 Video",
    "video.modal.close": "Close video modal",
    "video.modal.support": "Supported formats: MuseScore (.mscz / .mscx) and Guitar Pro 5 (.gp5)",
    "video.modal.maxSize": "Maximum file size: 25MB",
    "video.modal.tip": "Best results: include Guitar Tab in the MuseScore file. If it is staff-only notation, fret positions may be inaccurate.",
    "video.modal.drop.hint": "Drag and drop file here, or",
    "video.modal.upload": "Choose File",
    "video.modal.cancel": "Cancel",
    "video.modal.generate": "Generate MP4",
    "video.file.none": "No file selected yet.",
    "video.status.idle": "Select a MuseScore file, then start rendering.",
    "video.status.invalidType": "Unsupported file type. Only .mscz, .mscx, or .gp5 is supported.",
    "video.status.invalidSize": "File is too large. Please upload a file up to 25MB.",
    "video.status.reading": "Reading file. Please wait...",
    "video.status.startingBridge": "Starting local render bridge...",
    "video.status.rendering": "Rendering animation and audio from score. Please wait...",
    "video.status.success": "MP4 generated. Download starting.",
    "video.status.failed": "Render failed: {reason}",
    "video.status.busy": "A render is already running. Please wait.",
    "recorder.title": "Shape Recorder (MVP)",
    "recorder.subhead": "Plot notes on the board, set a root anchor, then export a template",
    "recorder.start": "Start",
    "recorder.cancel": "Cancel",
    "recorder.export": "Generate",
    "recorder.copy": "Copy",
    "recorder.copyDone": "Copied",
    "recorder.status.idle": "Not recording",
    "recorder.field.name": "Name",
    "recorder.field.mode": "Mode",
    "recorder.field.system": "System",
    "recorder.field.collection": "Collection note",
    "recorder.placeholder.name": "e.g. C-Linked Position",
    "recorder.placeholder.mode": "e.g. Major Scale Position",
    "recorder.placeholder.system": "e.g. CAGED × 3NPS",
    "recorder.placeholder.collection": "e.g. Five Major Scale Shapes",
    "recorder.markerList.title": "Marked notes (click a pill to set root anchor)",
    "recorder.output.label": "Export output (send this back to Codex)",
    "recorder.output.placeholder": "Generated JS template will appear here",
    "recorder.status.active": "Recording",
    "recorder.status.marked": "{count} marked",
    "recorder.status.recent": "Last selected: string {string} / fret {fret}",
    "recorder.status.root": "Root anchor: string {string} / fret {fret} ({note})",
    "recorder.emptyMarkers": "No markers yet. Click on the fretboard to draw a shape.",
    "recorder.rootAnchor.title": "Set as root anchor",
    "recorder.markerPill": "String {string} · Fret {fret} · {note}{rootTag}",
    "recorder.rootTag": " · Root",
    "recorder.warningOk": "No obvious structural warnings.",
    "recorder.exportFailHeader": "Export failed",
    "recorder.copyFailAppend": "Copy failed: clipboard API is unavailable in this browser context. Please copy manually.",
    "recorder.error.needRoot": "Please choose a root anchor in the marked-note list first.",
    "library.title": "Library",
    "library.subhead": "CAGED / Pentatonic / 3NPS collections",
    "library.family.scales": "Scales",
    "library.family.chords": "Chords",
    "library.ungrouped": "Ungrouped",
    "count.items": "{count} items",
    "overlay.empty": "No overlays yet. Drag a shape to the fretboard.",
    "overlay.meta": "{mode} · {system} · String {string} · Fret {fret}",
    "overlay.action.hide": "Hide",
    "overlay.action.show": "Show",
    "overlay.action.delete": "Delete",
    "marker.hint": "Markers <strong>{count}</strong> · Click anywhere to add",
    "license.status.trial": "Trial mode: basic board interactions only. Export, preset library, and video rendering are full-version features. Unlock via /fretlab/.",
    "license.status.full": "Full version unlocked: preset library, PNG / SVG / PDF export, and video rendering are available.",
    "license.locked.export": "Export is a full-version feature. Please unlock first on /fretlab/.",
    "license.locked.library": "Preset shape library is a full-version feature. Please unlock first on /fretlab/.",
    "license.locked.video": "Video rendering is a full-version feature. Please unlock first on /fretlab/.",
    "help.modal.marker.enharmonic": "Long-press an existing note to switch its enharmonic spelling.",
    "footer.tagline": "Cognitive guitar fretboard training tool",
    "footer.copyrightPrefix": "Copyright © 2026. All rights reserved. Igor Chen ·",
    "meta.title": "IC Fretboard Lab",
  },
};

UI_TEXT["zh-hant"] = {
  ...UI_TEXT.zh,
  "lang.switch.aria": "語言切換",
  "palette.close.aria": "關閉指型庫面板",
  "app.title": "吉他指板白板",
  "board.dropHint": "拖拽指形到指板任意位置",
  "controls.title": "指板控制",
  "controls.subhead": "設定指板數量與音名偏好",
  "controls.instrument": "樂器",
  "controls.customInstrument.edit": "編輯",
  "controls.guitarTone": "吉他音色",
  "controls.boardCount": "指板數量",
  "controls.fretStart": "起始品位",
  "controls.fretEnd": "結束品位",
  "controls.fretCount": "品格數量",
  "controls.fretAdjust.aria": "品格增減",
  "controls.fretAdjust.decrease": "減少品格",
  "controls.fretAdjust.increase": "增加品格",
  "controls.notePreference": "音名偏好",
  "controls.notePreference.sharps": "升號",
  "controls.notePreference.flats": "降號",
  "controls.labelMode": "音名模式",
  "controls.labelMode.fixed": "固定調",
  "controls.labelMode.movableDo": "首調",
  "controls.movableDoRoot": "主音",
  "controls.tool.pointer": "滑鼠模式",
  "controls.tool.select": "框選模式",
  "controls.clearMarkers": "清除",
  "controls.flipBoard": "旋轉",
  "instrument.guitar": "吉他",
  "instrument.bass": "貝斯",
  "instrument.ukulele": "烏克麗麗",
  "instrument.custom": "自訂",
  "guitarTone.classical": "古典吉他",
  "guitarTone.folk": "民謠吉他",
  "customInstrument.modal.title": "自訂指板",
  "customInstrument.modal.close": "關閉自訂指板彈窗",
  "customInstrument.modal.cancel": "取消",
  "customInstrument.modal.save": "套用",
  "customInstrument.stringCount": "弦的數量",
  "customInstrument.tuningHint": "請按從低音弦到高音弦的順序填寫定音",
  "customInstrument.intervalTitle": "弦間音程",
  "customInstrument.intervalPreset.custom": "自訂",
  "customInstrument.intervalPreset.allFourths": "全部完全四度",
  "customInstrument.intervalPreset.allFifths": "全部完全五度",
  "customInstrument.intervalPreset.allMajorThirds": "全部大三度",
  "customInstrument.intervalPreset.allMinorThirds": "全部小三度",
  "customInstrument.intervalLabel": "{from}弦 -> {to}弦",
  "customInstrument.stringLabel": "{string}弦",
  "customInstrument.notePlaceholder": "例如：F# / Bb",
  "customInstrument.error.invalidStringCount": "弦數必須至少為 1。",
  "customInstrument.error.invalidNote": "第 {string} 弦定音無效。請輸入 A-G，並可帶 # 或 b。",
  "interval.m2": "小二度",
  "interval.M2": "大二度",
  "interval.m3": "小三度",
  "interval.M3": "大三度",
  "interval.P4": "完全四度",
  "interval.TT": "增四/減五",
  "interval.P5": "完全五度",
  "interval.m6": "小六度",
  "interval.M6": "大六度",
  "interval.m7": "小七度",
  "interval.M7": "大七度",
  "interval.P8": "純八度",
  "export.format": "匯出格式",
  "export.button": "匯出",
  "help.button": "幫助",
  "help.button.aria": "打開幫助彈窗",
  "help.modal.title": "快速幫助",
  "help.modal.close": "關閉幫助彈窗",
  "help.modal.intro": "這裡是最常用的基礎操作說明。",
  "help.modal.section.markers": "標記音符",
  "help.modal.marker.singleShort": "單擊",
  "help.modal.marker.doubleShort": "雙擊",
  "help.modal.marker.single": "點擊一下：在該位置放置一個白色音符球。",
  "help.modal.marker.double": "點擊兩下：在該位置放置一個黃色主音球。",
  "help.modal.marker.repeat": "再次點擊已有白球可移除它；黃色主音可在多個位置同時標記。",
  "help.modal.section.shapes": "拖拽指型",
  "help.modal.shapes.palette": "點開 Palette，從指型庫裡把指型拖到指板上即可預覽或放置。",
  "help.modal.shapes.select": "長按後拖拽，可以框選目前區域裡的音符，方便一起移動或複製。",
  "help.modal.shapes.custom": "自訂指板會按目前定弦重新換算指型位置，不再強行沿用標準吉他。",
  "help.modal.section.tools": "常用工具",
  "help.modal.tools.rotate": "使用 Rotate 可以切換指板朝向。",
  "help.modal.tools.range": "Start Fret / End Fret 可以控制目前顯示的品位範圍。",
  "help.modal.tools.audio": "點擊指板或透過 MIDI 輸入時，會播放目前位置對應的音高。",
  "video.modal.title": "生成 MP4 視頻",
  "video.modal.close": "關閉視頻彈窗",
  "video.modal.support": "支援格式：MuseScore（.mscz / .mscx）與 Guitar Pro 5（.gp5）",
  "video.modal.maxSize": "最大文件：25MB",
  "video.modal.tip": "最佳效果建議：MuseScore 文件請包含吉他 Tab。若僅有五線譜，指板位置可能出現偏差。",
  "video.modal.drop.hint": "拖拽文件到這裡，或",
  "video.modal.upload": "選擇文件",
  "video.modal.cancel": "取消",
  "video.file.none": "尚未選擇文件",
  "video.status.idle": "請選擇 MuseScore 文件後開始生成動畫。",
  "video.status.invalidType": "文件格式不支援。當前僅支援 .mscz、.mscx 或 .gp5。",
  "video.status.invalidSize": "文件過大。請上傳 25MB 以內的文件。",
  "video.status.reading": "正在讀取文件，請稍候…",
  "video.status.startingBridge": "正在啟動本地渲染服務…",
  "video.status.rendering": "正在根據譜面生成動畫與音頻，請稍候…",
  "video.status.success": "MP4 已生成，正在下載。",
  "video.status.busy": "正在生成中，請稍候完成當前任務。",
  "recorder.title": "錄製指型（MVP）",
  "recorder.subhead": "在指板上點出形狀，設根音錨點後匯出模板",
  "recorder.start": "開始錄製",
  "recorder.cancel": "取消錄製",
  "recorder.export": "生成模板",
  "recorder.copy": "複製結果",
  "recorder.copyDone": "已複製",
  "recorder.status.idle": "未開始錄製",
  "recorder.field.name": "名稱",
  "recorder.field.mode": "模式",
  "recorder.field.system": "系統",
  "recorder.field.collection": "收編備註",
  "recorder.placeholder.collection": "例如：五個大調音階",
  "recorder.markerList.title": "已標記點（點按按鈕設為根音錨點）",
  "recorder.output.label": "匯出結果（可直接發給我收編）",
  "recorder.output.placeholder": "生成後會出現 JS 模板",
  "recorder.status.active": "錄製中",
  "recorder.status.marked": "已標記 {count} 個",
  "recorder.status.recent": "最近點選：弦 {string} / 品 {fret}",
  "recorder.status.root": "根音錨點：弦 {string} / 品 {fret} ({note})",
  "recorder.emptyMarkers": "暫無標記點。先在指板上點擊畫出指型。",
  "recorder.rootAnchor.title": "設為根音錨點",
  "recorder.warningOk": "暫無明顯結構警告。",
  "recorder.exportFailHeader": "匯出失敗",
  "recorder.copyFailAppend": "複製失敗：當前瀏覽器環境不允許 clipboard API，請手動複製。",
  "recorder.error.needRoot": "請先在「已標記點」裡選擇一個根音錨點。",
  "library.title": "指型庫",
  "library.subhead": "CAGED / Pentatonic / 3NPS 完整集合",
  "library.family.scales": "音階",
  "library.family.chords": "和弦",
  "library.ungrouped": "未分組",
  "overlay.empty": "暫無指形疊加，請拖拽指形到指板。",
  "overlay.action.hide": "隱藏",
  "overlay.action.show": "顯示",
  "overlay.action.delete": "刪除",
  "marker.hint": "標記數 <strong>{count}</strong> · 點擊任意位置添加標記",
  "help.modal.marker.enharmonic": "長按已有音符，可以切換同音異名的顯示名稱。",
  "license.status.trial": "當前為試用版：可點擊指板標記；匯出、預設指型庫與視頻生成功能僅限完整版。前往 /fretlab/ 完成支付並驗證訪問碼。",
  "license.status.full": "完整版已解鎖：預設指型庫、PNG / SVG / PDF 匯出與視頻生成功能可用。",
  "license.locked.export": "匯出功能僅限完整版。請先在 Landing Page 完成支付並驗證訪問碼。",
  "license.locked.library": "預設指型庫僅限完整版。請先在 Landing Page 完成支付並驗證訪問碼。",
  "license.locked.video": "視頻生成功能僅限完整版。請先在 Landing Page 完成支付並驗證訪問碼。",
  "footer.tagline": "認知吉他指板訓練工具",
  "footer.copyrightPrefix": "版權所有 © 2026 · Igor Chen ·",
};

const LIBRARY_CATEGORY_LABELS = {
  zh: {
    caged: "CAGED系统",
    "major-scale": "大调音阶",
    "major-scale-5": "五个大调音阶",
    drop2: "Drop 2 和弦",
    drop3: "Drop 3 和弦",
    "shell-voicing": "Shell Voicing",
    triads: "三和弦（三个音三和弦）",
    "sus-chords": "Sus 和弦",
    "dim7-chords": "减七和弦",
    arpeggio: "琶音",
    pentatonic: "五声音阶",
    "blues-scale": "蓝调音阶",
    "diminished-scale": "减音阶",
    "whole-tone-scale": "全音阶",
    "melodic-minor-scale": "旋律小调",
    "harmonic-minor-scale": "和声小调",
    "three-nps": "三音固定指式（3NPS）",
  },
  en: {
    caged: "CAGED System",
    "major-scale": "Major Scale",
    "major-scale-5": "Five Major Scale Shapes",
    drop2: "Drop 2 Chords",
    drop3: "Drop 3 Chords",
    "shell-voicing": "Shell Voicing",
    triads: "Triads",
    "sus-chords": "Sus Chords",
    "dim7-chords": "Diminished 7 Chords",
    arpeggio: "Arpeggio",
    pentatonic: "Pentatonic",
    "blues-scale": "Blues Scale",
    "diminished-scale": "Diminished Scale",
    "whole-tone-scale": "Whole Tone Scale",
    "melodic-minor-scale": "Melodic Minor",
    "harmonic-minor-scale": "Harmonic Minor",
    "three-nps": "3NPS Scales",
  },
};
LIBRARY_CATEGORY_LABELS["zh-hant"] = { ...LIBRARY_CATEGORY_LABELS.zh };

const LIBRARY_SECTION_LABELS = {
  zh: {
    "caged-major-chords": "五个大三和弦指型（C / A / G / E / D）",
    "major-scale-5-caged-recorded": "五个大调音阶",
    "major-scale-5": "五个大调音阶",
    "major-scale-3nps": "3 Notes per String",
    "melodic-minor-5": "五个旋律小调",
    "harmonic-minor-5": "五个和声小调",
    "drop2-major7": "大七和弦 · 4个转位",
    "drop2-minor7": "小七和弦 · 4个转位",
    "drop2-dominant7": "属七和弦 · 4个转位",
    "drop2-half-diminished7": "半减七和弦（m7b5）· 4个转位",
    "drop2-sus2-7": "7sus2 · 4个转位",
    "drop2-sus4-7": "7sus4 · 4个转位",
    "drop3-major7": "大七和弦 · 4个转位",
    "drop3-minor7": "小七和弦 · 4个转位",
    "drop3-dominant7": "属七和弦 · 4个转位",
    "drop3-half-diminished7": "半减七和弦（m7b5）· 4个转位",
    "drop3-sus2-7": "7sus2 · 4个转位",
    "drop3-sus4-7": "7sus4 · 4个转位",
    "shell-voicing-triads": "三和弦",
    "shell-voicing-seventh": "七和弦",
    "shell-triad-major": "大三和弦",
    "shell-triad-minor": "小三和弦",
    "shell-seventh-major7": "大七和弦",
    "shell-seventh-minor7": "小七和弦",
    "shell-seventh-dominant7": "属七和弦",
    "shell-seventh-half-diminished7": "半减七和弦（m7b5）",
    "shell-seventh-diminished7": "减七和弦",
    "triads-major": "大三和弦 · 3个转位",
    "triads-minor": "小三和弦 · 3个转位",
    "triads-diminished": "减三和弦 · 3个转位",
    "triads-augmented": "增三和弦 · 3个转位",
    "triads-sus2": "Sus2 · 3个转位",
    "triads-sus4": "Sus4 · 3个转位",
    "sus-chords-sus2": "Sus2",
    "sus-chords-sus4": "Sus4",
    "sus2-drop2": "Sus2 · Drop 2",
    "sus2-drop3": "Sus2 · Drop 3",
    "sus2-triads": "Sus2 · Triads",
    "sus4-drop2": "Sus4 · Drop 2",
    "sus4-drop3": "Sus4 · Drop 3",
    "sus4-triads": "Sus4 · Triads",
    "dim7-chord-movable": "可移动指型 · 根音在 6 / 5 / 4 弦",
    "arpeggio-dominant7": "属七和弦琶音 · 5个指型",
    "arpeggio-major7": "大七和弦琶音 · 5个指型",
    "arpeggio-minor7": "小七和弦琶音 · 5个指型",
    "arpeggio-half-diminished7": "半减七和弦琶音 · 5个指型",
    "pent-minor": "纵向",
    "pent-grouping-32-23": "斜向",
    "blues-scale-boxes": "五个蓝调音阶把位",
    "blues-grouping-32-23": "斜向",
    "blues-scale-horizontal": "横向",
    "blues-scale-diagonal": "斜向",
    "diminished-scale-vertical": "纵向",
    "diminished-scale-diagonal": "斜向",
    "whole-tone-scale": "全音阶",
    "whole-tone-scale-horizontal": "横向",
    "whole-tone-scale-diagonal": "斜向",
    "melodic-minor-3nps": "3 Notes per String",
    "harmonic-minor-3nps": "3 Notes per String",
    "3nps-major": "大调音阶 · 7个指型",
    "3nps-natural-minor": "自然小调音阶 · 7个指型",
    "3nps-melodic-minor": "旋律小调音阶 · 7个指型",
    "3nps-harmonic-minor": "和声小调音阶 · 7个指型",
  },
  en: {
    "caged-major-chords": "Five Major Chord Forms (C / A / G / E / D)",
    "major-scale-5-caged-recorded": "Five Major Scale Shapes",
    "major-scale-5": "Five Major Scale Shapes",
    "major-scale-3nps": "3 Notes per String",
    "melodic-minor-5": "Five Melodic Minor Shapes",
    "harmonic-minor-5": "Five Harmonic Minor Shapes",
    "drop2-major7": "Major 7 · 4 Inversions",
    "drop2-minor7": "Minor 7 · 4 Inversions",
    "drop2-dominant7": "Dominant 7 · 4 Inversions",
    "drop2-half-diminished7": "Half-Diminished 7 (m7b5) · 4 Inversions",
    "drop2-sus2-7": "7sus2 · 4 Inversions",
    "drop2-sus4-7": "7sus4 · 4 Inversions",
    "drop3-major7": "Major 7 · 4 Inversions",
    "drop3-minor7": "Minor 7 · 4 Inversions",
    "drop3-dominant7": "Dominant 7 · 4 Inversions",
    "drop3-half-diminished7": "Half-Diminished 7 (m7b5) · 4 Inversions",
    "drop3-sus2-7": "7sus2 · 4 Inversions",
    "drop3-sus4-7": "7sus4 · 4 Inversions",
    "shell-voicing-triads": "Triads",
    "shell-voicing-seventh": "Seventh Chords",
    "shell-triad-major": "Major Triad",
    "shell-triad-minor": "Minor Triad",
    "shell-seventh-major7": "Major 7",
    "shell-seventh-minor7": "Minor 7",
    "shell-seventh-dominant7": "Dominant 7",
    "shell-seventh-half-diminished7": "Half-Diminished 7 (m7b5)",
    "shell-seventh-diminished7": "Diminished 7",
    "triads-major": "Major Triads · 3 Inversions",
    "triads-minor": "Minor Triads · 3 Inversions",
    "triads-diminished": "Diminished Triads · 3 Inversions",
    "triads-augmented": "Augmented Triads · 3 Inversions",
    "triads-sus2": "Sus2 Triads · 3 Inversions",
    "triads-sus4": "Sus4 Triads · 3 Inversions",
    "sus-chords-sus2": "Sus2",
    "sus-chords-sus4": "Sus4",
    "sus2-drop2": "Sus2 · Drop 2",
    "sus2-drop3": "Sus2 · Drop 3",
    "sus2-triads": "Sus2 · Triads",
    "sus4-drop2": "Sus4 · Drop 2",
    "sus4-drop3": "Sus4 · Drop 3",
    "sus4-triads": "Sus4 · Triads",
    "dim7-chord-movable": "Movable Shape · Root on 6th / 5th / 4th",
    "arpeggio-dominant7": "Dominant 7th Arpeggios · 5 Shapes",
    "arpeggio-major7": "Major 7th Arpeggios · 5 Shapes",
    "arpeggio-minor7": "Minor 7th Arpeggios · 5 Shapes",
    "arpeggio-half-diminished7": "Half-Diminished 7th Arpeggios · 5 Shapes",
    "pent-minor": "Vertical",
    "pent-grouping-32-23": "Diagonal",
    "blues-scale-boxes": "Five Blues Scale Boxes",
    "blues-grouping-32-23": "Diagonal",
    "blues-scale-horizontal": "Horizontal",
    "blues-scale-diagonal": "Diagonal",
    "diminished-scale-vertical": "Vertical",
    "diminished-scale-diagonal": "Diagonal",
    "whole-tone-scale": "Whole Tone Scale",
    "whole-tone-scale-horizontal": "Horizontal",
    "whole-tone-scale-diagonal": "Diagonal",
    "melodic-minor-3nps": "3 Notes per String",
    "harmonic-minor-3nps": "3 Notes per String",
    "3nps-major": "Major Scale · 7 Shapes",
    "3nps-natural-minor": "Natural Minor · 7 Shapes",
    "3nps-melodic-minor": "Melodic Minor · 7 Shapes",
    "3nps-harmonic-minor": "Harmonic Minor · 7 Shapes",
  },
};
LIBRARY_SECTION_LABELS["zh-hant"] = { ...LIBRARY_SECTION_LABELS.zh };

const INVERSION_NAME_LABELS = {
  zh: {
    "Root Position": "原位",
    "First Position": "第一转位",
    "Second Position": "第二转位",
    "Third Position": "第三转位",
  },
  en: {
    "Root Position": "Root Position",
    "First Position": "First Position",
    "Second Position": "Second Position",
    "Third Position": "Third Position",
  },
};
INVERSION_NAME_LABELS["zh-hant"] = {
  "Root Position": "原位",
  "First Position": "第一轉位",
  "Second Position": "第二轉位",
  "Third Position": "第三轉位",
};

function resolveBridgeHttpBase() {
  const override = typeof window !== "undefined" ? window.__FRETLAB_BRIDGE_HTTP_BASE__ : "";
  const base =
    typeof override === "string" && override.trim() ? override.trim() : "http://127.0.0.1:3210";
  return base.replace(/\/+$/, "");
}

const MAX_FRET_COUNT = 72;
const BRIDGE_HTTP_BASE = resolveBridgeHttpBase();
const BRIDGE_EVENT_STREAM_URL = `${BRIDGE_HTTP_BASE}/events`;
const BRIDGE_BOOTSTRAP_ENDPOINT = "/api/bridge/ensure";
const BRIDGE_HEALTHCHECK_TIMEOUT_MS = 1500;
const BRIDGE_AUTOSTART_TIMEOUT_MS = 15000;
const VIDEO_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const REALTIME_ONSET_FLASH_MS = 220;
const REALTIME_FX_FLASH_MS = 520;
const REALTIME_SLIDE_TRAIL_MS = 420;
const DIMENSIONS = {
  stringSpacing: 48,
  fretSpacing: 90,
  boardPadding: 24,
  openWidth: 80,
};

const mod12 = (value) => ((value % 12) + 12) % 12;
const MAJOR_SCALE_DEGREE_MAP = {
  0: "1",
  2: "2",
  4: "3",
  5: "4",
  7: "5",
  9: "6",
  11: "7",
};
const NATURAL_MINOR_DEGREE_MAP = {
  0: "1",
  2: "2",
  3: "b3",
  5: "4",
  7: "5",
  8: "b6",
  10: "b7",
};
const MELODIC_MINOR_DEGREE_MAP = {
  0: "1",
  2: "2",
  3: "b3",
  5: "4",
  7: "5",
  9: "6",
  11: "7",
};
const HARMONIC_MINOR_DEGREE_MAP = {
  0: "1",
  2: "2",
  3: "b3",
  5: "4",
  7: "5",
  8: "b6",
  11: "7",
};
const DORIAN_DEGREE_MAP = {
  0: "1",
  2: "2",
  3: "b3",
  5: "4",
  7: "5",
  9: "6",
  10: "b7",
};
const PHRYGIAN_DEGREE_MAP = {
  0: "1",
  1: "b2",
  3: "b3",
  5: "4",
  7: "5",
  8: "b6",
  10: "b7",
};
const LYDIAN_DEGREE_MAP = {
  0: "1",
  2: "2",
  4: "3",
  6: "#4",
  7: "5",
  9: "6",
  11: "7",
};
const MIXOLYDIAN_DEGREE_MAP = {
  0: "1",
  2: "2",
  4: "3",
  5: "4",
  7: "5",
  9: "6",
  10: "b7",
};
const LOCRIAN_DEGREE_MAP = {
  0: "1",
  1: "b2",
  3: "b3",
  5: "4",
  6: "b5",
  8: "b6",
  10: "b7",
};
const MINOR_PENTATONIC_DEGREE_MAP = {
  0: "1",
  3: "b3",
  5: "4",
  7: "5",
  10: "b7",
};
const MAJOR_PENTATONIC_DEGREE_MAP = {
  0: "1",
  2: "2",
  4: "3",
  7: "5",
  9: "6",
};
const BLUES_SCALE_DEGREE_MAP = {
  0: "1",
  3: "b3",
  5: "4",
  6: "b5",
  7: "5",
  10: "b7",
};
const WHOLE_TONE_DEGREE_MAP = {
  0: "1",
  2: "2",
  4: "3",
  6: "#4",
  8: "#5",
  10: "b7",
};
const MELODIC_MINOR_MODE_DEGREE_MAPS = [
  { 0: "1", 2: "2", 3: "b3", 5: "4", 7: "5", 9: "6", 11: "7" }, // Melodic Minor
  { 0: "1", 1: "b2", 3: "b3", 5: "4", 7: "5", 9: "6", 10: "b7" }, // Dorian b2
  { 0: "1", 2: "2", 4: "3", 6: "#4", 8: "#5", 9: "6", 11: "7" }, // Phrygian #5
  { 0: "1", 2: "2", 4: "3", 6: "#4", 7: "5", 9: "6", 10: "b7" }, // Lydian Dominant
  { 0: "1", 2: "2", 4: "3", 5: "4", 7: "5", 8: "b6", 10: "b7" }, // Mixolydian b6
  { 0: "1", 2: "2", 3: "b3", 5: "4", 6: "b5", 8: "b6", 10: "b7" }, // Aeolian b5
  { 0: "1", 1: "b2", 3: "b3", 4: "3", 6: "b5", 8: "b6", 10: "b7" }, // Super Locrian
];
const HARMONIC_MINOR_MODE_DEGREE_MAPS = [
  { 0: "1", 2: "2", 3: "b3", 5: "4", 7: "5", 8: "b6", 11: "7" }, // Harmonic Minor
  { 0: "1", 1: "b2", 3: "b3", 5: "4", 6: "b5", 9: "6", 10: "b7" }, // Locrian #6
  { 0: "1", 2: "2", 4: "3", 5: "4", 8: "#5", 9: "6", 11: "7" }, // Ionian #5
  { 0: "1", 2: "2", 3: "b3", 6: "#4", 7: "5", 9: "6", 10: "b7" }, // Dorian #4
  { 0: "1", 1: "b2", 4: "3", 5: "4", 7: "5", 8: "b6", 10: "b7" }, // Phrygian Dominant
  { 0: "1", 3: "#2", 4: "3", 6: "#4", 7: "5", 9: "6", 11: "7" }, // Lydian #2
  { 0: "1", 1: "b2", 3: "b3", 4: "3", 6: "b5", 8: "b6", 9: "bb7" }, // Super Locrian bb7
];
const DIMINISHED_ST_DEGREE_MAP = {
  0: "1",
  1: "b2",
  3: "#2",
  4: "3",
  6: "#4",
  7: "5",
  9: "6",
  10: "b7",
};
const DIMINISHED_TS_DEGREE_MAP = {
  0: "1",
  2: "2",
  3: "b3",
  5: "4",
  6: "b5",
  8: "#5",
  9: "6",
  11: "7",
};
const DEGREE_LABEL_ALIAS = {
  "1": "Do",
  "2": "Re",
  "3": "Mi",
  "4": "Fa",
  "5": "Sol",
  "6": "La",
  "7": "Ti",
  b2: "bRe",
  "#2": "#Re",
  b3: "bMi",
  "#3": "#Mi",
  b4: "bFa",
  "#4": "#Fa",
  b5: "bSol",
  "#5": "#Sol",
  b6: "bLa",
  "#6": "#La",
  b7: "bTi",
  bb7: "bbTi",
  R: "R",
};
const sketchNoise = (seed) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453123;
  return x - Math.floor(x);
};
const sketchJitter = (seed, magnitude) => (sketchNoise(seed) - 0.5) * 2 * magnitude;
const OVERLAY_NOTE_NAME_PRIORITY = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const FRET_MARKER_SINGLE_FRETS = new Set([3, 5, 7, 9, 15, 17, 19, 21]);
const FRET_MARKER_DOUBLE_FRETS = new Set([12]);
const FRETBOARD_ORIENTATION_LEFT = 0;
const FRETBOARD_ORIENTATION_TOP = 1;
const FRETBOARD_ORIENTATION_RIGHT = 2;
const DEFAULT_LANDSCAPE_FRET_START = 1;
const DEFAULT_LANDSCAPE_FRET_END = 12;
const DEFAULT_TOP_FRET_SPAN = 7;
const getVisibleFretStart = () => Math.max(1, Math.min(Math.round(Number(state.fretStart) || 1), state.fretCount));
const isOpenFretVisible = () => getVisibleFretStart() === 1;
const getVisibleFretCount = () => Math.max(1, state.fretCount - getVisibleFretStart() + 1);
const getLeadingAreaWidth = () => (isOpenFretVisible() ? DIMENSIONS.openWidth : 0);
const getVisibleMinimumFret = () => (isOpenFretVisible() ? 0 : getVisibleFretStart());
const isBoardFretVisible = (fret) =>
  Number.isFinite(fret) &&
  (isOpenFretVisible()
    ? (fret === 0 || (fret >= 1 && fret <= state.fretCount))
    : (fret >= getVisibleFretStart() && fret <= state.fretCount));
const getVisualStringIndex = (stringIndex) => getStringCount() - 1 - stringIndex;
const getStringSpacing = () => Number(getActiveInstrument()?.stringSpacing ?? DIMENSIONS.stringSpacing) || DIMENSIONS.stringSpacing;
const getStringY = (stringIndex) =>
  DIMENSIONS.boardPadding + getVisualStringIndex(stringIndex) * getStringSpacing();
const getCellY = (stringIndex) => getStringY(stringIndex) - getStringSpacing() / 2;
const getTotalBoardWidth = (fretCount = state.fretCount) =>
  getLeadingAreaWidth() + DIMENSIONS.fretSpacing * Math.max(1, getVisibleFretCount());
const getNutX = () => getLeadingAreaWidth();
const getOpenAreaX = () => 0;
const getFretboardAreaX = () => getLeadingAreaWidth();
const getFretX = (fret) => getLeadingAreaWidth() + (fret - getVisibleFretStart()) * DIMENSIONS.fretSpacing;
const getMarkerCenterX = (fret) =>
  fret === 0 && isOpenFretVisible()
    ? getOpenAreaX() + DIMENSIONS.openWidth / 2
    : getFretX(fret) + DIMENSIONS.fretSpacing / 2;
const MOVABLE_DO_LABELS_SHARPS = ["1", "#1", "2", "#2", "3", "4", "#4", "5", "#5", "6", "#6", "7"];
const MOVABLE_DO_LABELS_FLATS = ["1", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7"];
const NUMERIC_LABEL_FONT_STACK = '"Virgil FretLab", "Virgil", "Patrick Hand", "Xiaolai SC", "Xiaolai", "HanziPen SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", cursive, sans-serif';
const isMovableDoEnabled = () => state.labelMode === "movable-do";
const getMovableDoRootNoteIndex = () => mod12(Number(state.movableDoRoot) || 0);

function getMovableDoLabelFromSemitone(semitone) {
  const labels = state.notePreference === "flats" ? MOVABLE_DO_LABELS_FLATS : MOVABLE_DO_LABELS_SHARPS;
  return labels[mod12(Number(semitone) || 0)] ?? "1";
}

function getMovableDoLabel(noteIndex) {
  if (!Number.isFinite(noteIndex)) {
    return "";
  }
  return getMovableDoLabelFromSemitone(mod12(noteIndex - getMovableDoRootNoteIndex()));
}

function getDisplayLabelForNoteIndex(noteIndex, { customLabel = null } = {}) {
  if (isMovableDoEnabled()) {
    return getMovableDoLabel(noteIndex);
  }
  return customLabel ?? getNoteName(noteIndex, state.notePreference);
}

const getMarkerDisplayLabel = (marker) => getDisplayLabelForNoteIndex(marker.noteIndex, { customLabel: marker.customLabel });
const getOverlayPreferredNoteName = (noteIndex) => OVERLAY_NOTE_NAME_PRIORITY[mod12(noteIndex)] ?? "C";
const instrumentShapeCache = new Map();

function getFretboardOrientationFrame(boardWidth, boardHeight) {
  const orientation = Number(state.fretboardOrientation);
  if (orientation === FRETBOARD_ORIENTATION_TOP) {
    return {
      viewWidth: boardHeight,
      viewHeight: boardWidth,
      transform: `translate(${boardHeight} 0) rotate(90)`,
    };
  }
  if (orientation === FRETBOARD_ORIENTATION_RIGHT) {
    return {
      viewWidth: boardWidth,
      viewHeight: boardHeight,
      transform: `translate(${boardWidth} ${boardHeight}) rotate(180)`,
    };
  }
  return {
    viewWidth: boardWidth,
    viewHeight: boardHeight,
    transform: "",
  };
}

function getBoardContentLayer(svg) {
  if (!(svg instanceof SVGSVGElement)) {
    return null;
  }
  const layer = svg.querySelector(".board-content");
  return layer instanceof SVGGElement ? layer : svg;
}

function getTextCounterRotationDegrees() {
  const orientation = Number(state.fretboardOrientation);
  if (orientation === FRETBOARD_ORIENTATION_TOP) {
    return -90;
  }
  if (orientation === FRETBOARD_ORIENTATION_RIGHT) {
    return 180;
  }
  return 0;
}

function getSvgTextTransformValue(x, y) {
  const degrees = getTextCounterRotationDegrees();
  if (!degrees) {
    return "";
  }
  return `rotate(${degrees} ${x} ${y})`;
}

function getSvgTextTransformAttr(x, y) {
  const transformValue = getSvgTextTransformValue(x, y);
  if (!transformValue) {
    return "";
  }
  return ` transform="${transformValue}"`;
}

function getBoardOrientationName() {
  const orientation = Number(state.fretboardOrientation);
  if (orientation === FRETBOARD_ORIENTATION_TOP) {
    return "top";
  }
  if (orientation === FRETBOARD_ORIENTATION_RIGHT) {
    return "right";
  }
  return "left";
}

function getNextFretboardOrientation(currentOrientation = state.fretboardOrientation) {
  const normalized = Number(currentOrientation);
  if (normalized === FRETBOARD_ORIENTATION_LEFT) {
    return FRETBOARD_ORIENTATION_TOP;
  }
  if (normalized === FRETBOARD_ORIENTATION_TOP) {
    return FRETBOARD_ORIENTATION_RIGHT;
  }
  return FRETBOARD_ORIENTATION_LEFT;
}

function projectShapePositionsToInstrument(positions, anchorString, sourceStart, sourceEnd) {
  const normalizedAnchor = Number(anchorString);
  if (!Number.isFinite(normalizedAnchor)) {
    return [];
  }
  const projected = [];
  for (const pos of positions ?? []) {
    const relativeString = Number(pos?.string);
    const fret = Number(pos?.fret);
    const interval = Number(pos?.interval);
    if (!Number.isFinite(relativeString) || !Number.isFinite(fret)) {
      continue;
    }
    const sourceString = normalizedAnchor + relativeString;
    if (sourceString < sourceStart || sourceString > sourceEnd) {
      continue;
    }
    const sourceOpenNoteIndex = getNoteIndex(STANDARD_GUITAR_TUNING[sourceString]);
    projected.push({
      mappedString: sourceString - sourceStart,
      fret,
      interval: Number.isFinite(interval) ? mod12(interval) : 0,
      sourceNoteIndex: Number.isFinite(sourceOpenNoteIndex) ? mod12(sourceOpenNoteIndex + fret) : null,
    });
  }
  return projected;
}

function buildAdaptedShapePositions(positions, anchorString, sourceStart, sourceEnd) {
  const projected = projectShapePositionsToInstrument(positions ?? [], anchorString, sourceStart, sourceEnd);
  if (!projected.length) {
    return null;
  }

  let mappedAnchor =
    Number(anchorString) >= sourceStart && Number(anchorString) <= sourceEnd
      ? Number(anchorString) - sourceStart
      : null;

  if (!Number.isInteger(mappedAnchor)) {
    const rootCandidate = projected.find((pos) => pos.interval === 0);
    mappedAnchor = rootCandidate ? rootCandidate.mappedString : projected[0].mappedString;
  }

  const deduped = new Map();
  projected.forEach((pos) => {
    const relativeString = pos.mappedString - mappedAnchor;
    const key = `${relativeString}:${pos.fret}:${pos.interval}`;
    if (!deduped.has(key)) {
      deduped.set(key, {
        string: relativeString,
        fret: pos.fret,
        interval: pos.interval,
        sourceNoteIndex: Number.isFinite(pos.sourceNoteIndex) ? mod12(pos.sourceNoteIndex) : null,
      });
    }
  });

  const nextPositions = Array.from(deduped.values()).sort((a, b) => a.string - b.string || a.fret - b.fret);
  if (!nextPositions.length) {
    return null;
  }

  return {
    anchorString: mappedAnchor,
    positions: nextPositions,
  };
}

function adaptVariantMapForInstrument(variantMap, sourceStart, sourceEnd, sourceCount) {
  if (!variantMap || typeof variantMap !== "object") {
    return null;
  }

  const adapted = {};
  Object.entries(variantMap).forEach(([rawKey, variant]) => {
    const adaptedVariant = buildAdaptedShapePositions(
      variant?.positions ?? [],
      variant?.anchorString,
      sourceStart,
      sourceEnd
    );
    if (!adaptedVariant) {
      return;
    }

    const rawStart = Number(variant?.stringSetStart ?? rawKey);
    const mappedStart = Number.isFinite(rawStart) ? rawStart - sourceStart : NaN;
    const hasValidMappedStart = Number.isFinite(mappedStart) && mappedStart >= 0 && mappedStart <= sourceCount - 1;
    const variantKey = hasValidMappedStart ? String(Math.round(mappedStart)) : rawKey;

    adapted[variantKey] = {
      ...(variant ?? {}),
      stringSetStart: hasValidMappedStart ? Math.round(mappedStart) : variant?.stringSetStart,
      anchorString: adaptedVariant.anchorString,
      anchorLabel: getStringLabelByCount(adaptedVariant.anchorString, sourceCount),
      positions: adaptedVariant.positions,
    };
  });

  return Object.keys(adapted).length ? adapted : null;
}

function cloneRelativePositions(positions) {
  return (positions ?? []).map((pos) => ({
    ...pos,
    string: Number(pos?.string),
    fret: Number(pos?.fret),
    interval: Number(pos?.interval),
    sourceNoteIndex: Number.isFinite(pos?.sourceNoteIndex) ? mod12(Number(pos.sourceNoteIndex)) : null,
  }));
}

function chooseClosestEquivalentFretOffset(baseOffset, preferredOffset = 0) {
  const normalizedBase = mod12(Number(baseOffset) || 0);
  const preferred = Number(preferredOffset) || 0;
  let bestCandidate = normalizedBase;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let octave = -4; octave <= 4; octave += 1) {
    const candidate = normalizedBase + octave * 12;
    const distance = Math.abs(candidate - preferred);
    // Preserve the original shape contour first, and only then prefer lower
    // octaves to avoid wrapping near the nut (e.g. -1 should win over 11).
    const score = distance * 100 + Math.abs(candidate);
    if (score < bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

function compactRetunedRelativePositions(positions) {
  const nextPositions = (positions ?? []).map((pos) => ({ ...pos }));
  if (nextPositions.length < 2) {
    return nextPositions;
  }

  const preferredFrets = nextPositions.map((pos) =>
    Number.isFinite(pos?.preferredFret) ? Number(pos.preferredFret) : Number(pos?.fret) || 0
  );
  const minPreferred = Math.min(...preferredFrets);
  const maxPreferred = Math.max(...preferredFrets);
  const avgPreferred = preferredFrets.reduce((sum, value) => sum + value, 0) / preferredFrets.length;

  let bestPositions = nextPositions.map((pos) => ({ ...pos }));
  let bestScore = Number.POSITIVE_INFINITY;

  for (let windowStart = Math.floor(minPreferred) - 12; windowStart <= Math.ceil(maxPreferred) + 12; windowStart += 1) {
    const windowEnd = windowStart + 11;
    const candidatePositions = [];
    let valid = true;

    for (let index = 0; index < nextPositions.length; index += 1) {
      const pos = nextPositions[index];
      const baseClass = mod12(Number(pos?.fret) || 0);
      let candidateFret = null;
      for (let octave = -6; octave <= 12; octave += 1) {
        const value = baseClass + octave * 12;
        if (value >= windowStart && value <= windowEnd) {
          candidateFret = value;
          break;
        }
      }
      if (!Number.isFinite(candidateFret)) {
        valid = false;
        break;
      }
      candidatePositions.push({
        ...pos,
        fret: candidateFret,
      });
    }

    if (!valid || !candidatePositions.length) {
      continue;
    }

    const candidateFrets = candidatePositions.map((pos) => Number(pos.fret));
    const span = Math.max(...candidateFrets) - Math.min(...candidateFrets);
    const negativePenalty = Math.max(0, -Math.min(...candidateFrets));
    const avgCandidate = candidateFrets.reduce((sum, value) => sum + value, 0) / candidateFrets.length;
    const distancePenalty = candidatePositions.reduce((sum, pos, index) => {
      return sum + Math.abs(Number(pos.fret) - preferredFrets[index]);
    }, 0);
    const score = span * 10000 + negativePenalty * 500 + distancePenalty * 100 + Math.abs(avgCandidate - avgPreferred);

    if (score < bestScore) {
      bestScore = score;
      bestPositions = candidatePositions;
    }
  }

  return bestPositions;
}

function retuneRelativePositionsForCustomTuning(positions, anchorString, tuning) {
  const normalizedAnchor = Number(anchorString);
  if (
    !Array.isArray(tuning) ||
    !tuning.length ||
    !Number.isInteger(normalizedAnchor) ||
    normalizedAnchor < 0 ||
    normalizedAnchor >= tuning.length
  ) {
    return cloneRelativePositions(positions);
  }

  const anchorNoteIndex = getNoteIndex(tuning[normalizedAnchor]);
  if (!Number.isFinite(anchorNoteIndex)) {
    return cloneRelativePositions(positions);
  }

  const retuned = [];
  for (const pos of positions ?? []) {
    const relativeString = Number(pos?.string);
    const originalFret = Number(pos?.fret);
    const interval = Number(pos?.interval);
    const absoluteString = normalizedAnchor + relativeString;
    if (
      !Number.isInteger(relativeString) ||
      !Number.isFinite(originalFret) ||
      !Number.isFinite(interval) ||
      absoluteString < 0 ||
      absoluteString >= tuning.length
    ) {
      continue;
    }

    const stringNoteIndex = getNoteIndex(tuning[absoluteString]);
    if (!Number.isFinite(stringNoteIndex)) {
      continue;
    }

    const sourceNoteIndex = Number.isFinite(pos?.sourceNoteIndex) ? mod12(Number(pos.sourceNoteIndex)) : null;
    const requiredFretOffset = Number.isFinite(sourceNoteIndex)
      ? mod12(sourceNoteIndex - stringNoteIndex)
      : mod12(interval + anchorNoteIndex - stringNoteIndex);
    const adaptedFret = chooseClosestEquivalentFretOffset(requiredFretOffset, originalFret);
    const nextPos = {
      ...pos,
      string: relativeString,
      fret: adaptedFret,
      preferredFret: originalFret,
      interval: mod12(interval),
      sourceNoteIndex: Number.isFinite(sourceNoteIndex) ? sourceNoteIndex : null,
    };
    retuned.push(nextPos);
  }

  const deduped = new Map();
  compactRetunedRelativePositions(retuned).forEach((pos) => {
    const key = `${pos.string}:${pos.fret}:${pos.interval}`;
    if (!deduped.has(key)) {
      deduped.set(key, pos);
    }
  });

  return Array.from(deduped.values()).sort((a, b) => a.string - b.string || a.fret - b.fret);
}

function buildVariantEntryListFromMap(variantMap) {
  if (!variantMap || typeof variantMap !== "object") {
    return [];
  }
  return Object.entries(variantMap)
    .map(([variantId, variant]) => ({
      variantId,
      stringSetStart: Number(variant?.stringSetStart ?? variantId),
      anchorString: Number(variant?.anchorString),
      positions: cloneRelativePositions(variant?.positions),
    }))
    .filter(
      (variant) =>
        Number.isFinite(variant.stringSetStart) &&
        Number.isInteger(variant.anchorString) &&
        Array.isArray(variant.positions) &&
        variant.positions.length
    );
}

function dedupePlacementVariantList(entries) {
  const deduped = new Map();
  for (const entry of entries ?? []) {
    const key = [
      Math.round(Number(entry?.stringSetStart)),
      Math.round(Number(entry?.anchorString)),
      (entry?.positions ?? [])
        .map((pos) => `${Math.round(Number(pos?.string))}:${Math.round(Number(pos?.fret))}:${Math.round(Number(pos?.interval))}`)
        .sort()
        .join("|"),
    ].join("::");
    if (!deduped.has(key)) {
      deduped.set(key, {
        ...entry,
        stringSetStart: Math.round(Number(entry?.stringSetStart)),
        anchorString: Math.round(Number(entry?.anchorString)),
        positions: cloneRelativePositions(entry?.positions),
      });
    }
  }
  return Array.from(deduped.values()).sort(
    (a, b) => a.stringSetStart - b.stringSetStart || a.anchorString - b.anchorString || `${a.variantId}`.localeCompare(`${b.variantId}`)
  );
}

function buildCustomPlacementVariantList(shape, instrument, variantMap) {
  const sourceWindows = Array.isArray(instrument?.sourceWindows) ? instrument.sourceWindows : [];
  if (!sourceWindows.length) {
    return [];
  }

  const entries = [];
  sourceWindows.forEach((window, windowIndex) => {
    const sourceStart = Number(window?.sourceStart ?? 0);
    const sourceCount = Number(window?.sourceCount ?? STANDARD_GUITAR_TUNING.length);
    const targetStart = Number(window?.targetStart ?? 0);
    const sourceEnd = sourceStart + sourceCount - 1;
    const adaptedMain = buildAdaptedShapePositions(shape?.positions ?? [], shape?.anchorString, sourceStart, sourceEnd);
    const adaptedVariantMap = adaptVariantMapForInstrument(variantMap, sourceStart, sourceEnd, sourceCount);
    const windowEntries = buildVariantEntryListFromMap(adaptedVariantMap);

    if (windowEntries.length) {
      windowEntries.forEach((entry, entryIndex) => {
        const absoluteAnchorString = Number(entry.anchorString) + targetStart;
        const sourcePositions = cloneRelativePositions(entry.positions);
        const retunedPositions = retuneRelativePositionsForCustomTuning(
          sourcePositions,
          absoluteAnchorString,
          instrument?.tuning
        );
        if (!retunedPositions.length) {
          return;
        }
        entries.push({
          variantId: `${windowIndex}:${entry.variantId}:${entryIndex}`,
          stringSetStart: Number(entry.stringSetStart) + targetStart,
          anchorString: absoluteAnchorString,
          sourcePositions,
          positions: retunedPositions,
        });
      });
      return;
    }

    if (!adaptedMain) {
      return;
    }

    const absoluteAnchorString = adaptedMain.anchorString + targetStart;
    const sourcePositions = cloneRelativePositions(adaptedMain.positions);
    const retunedPositions = retuneRelativePositionsForCustomTuning(
      sourcePositions,
      absoluteAnchorString,
      instrument?.tuning
    );
    if (!retunedPositions.length) {
      return;
    }

    entries.push({
      variantId: `${windowIndex}:base`,
      stringSetStart: targetStart,
      anchorString: absoluteAnchorString,
      sourcePositions,
      positions: retunedPositions,
    });
  });

  return dedupePlacementVariantList(entries);
}

function adaptShapeForInstrument(shape, instrument) {
  if (instrument?.id === CUSTOM_INSTRUMENT_ID) {
    const sourceWindows = Array.isArray(instrument?.sourceWindows) ? instrument.sourceWindows : [];
    const primaryWindow = sourceWindows[0];
    if (!primaryWindow) {
      return null;
    }
    const sourceStart = Number(primaryWindow.sourceStart ?? 0);
    const sourceCount = Number(primaryWindow.sourceCount ?? STANDARD_GUITAR_TUNING.length);
    const sourceEnd = sourceStart + sourceCount - 1;
    const targetStart = Number(primaryWindow.targetStart ?? 0);
    const adaptedMain = buildAdaptedShapePositions(shape?.positions ?? [], shape?.anchorString, sourceStart, sourceEnd);
    if (!adaptedMain) {
      return null;
    }

    const absoluteAnchorString = adaptedMain.anchorString + targetStart;
    const retunedMainPositions = retuneRelativePositionsForCustomTuning(
      adaptedMain.positions,
      absoluteAnchorString,
      instrument?.tuning
    );
    if (!retunedMainPositions.length) {
      return null;
    }

    const dragPlacementVariantList = buildCustomPlacementVariantList(shape, instrument, shape?.dragPlacementVariants);
    const drop2VariantList = buildCustomPlacementVariantList(shape, instrument, shape?.drop2Variants);
    const dragPlacementStarts = dragPlacementVariantList
      .map((variant) => Number(variant?.stringSetStart))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);
    const drop2StringSetStarts = drop2VariantList
      .map((variant) => Number(variant?.stringSetStart))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);

    return {
      ...shape,
      anchorString: absoluteAnchorString,
      anchorLabel: getStringLabelByCount(absoluteAnchorString, instrument.tuning.length),
      positions: retunedMainPositions,
      customPlacementSourcePositions: cloneRelativePositions(adaptedMain.positions),
      dragPlacementStarts: dragPlacementStarts.length ? Array.from(new Set(dragPlacementStarts)) : undefined,
      dragPlacementVariantList: dragPlacementVariantList.length ? dragPlacementVariantList : undefined,
      dragPlacementVariants: undefined,
      drop2StringSetStarts: drop2StringSetStarts.length ? Array.from(new Set(drop2StringSetStarts)) : undefined,
      drop2VariantList: drop2VariantList.length ? drop2VariantList : undefined,
      drop2Variants: undefined,
      anchorHintLabel: undefined,
    };
  }

  const sourceStart = Number(instrument?.sourceStringStart ?? 0);
  const sourceCount = Number(instrument?.sourceStringCount ?? 6);
  const sourceEnd = sourceStart + sourceCount - 1;
  const adaptedMain = buildAdaptedShapePositions(shape?.positions ?? [], shape?.anchorString, sourceStart, sourceEnd);
  if (!adaptedMain) {
    return null;
  }

  const dragPlacementVariants = adaptVariantMapForInstrument(
    shape?.dragPlacementVariants,
    sourceStart,
    sourceEnd,
    sourceCount
  );
  const drop2Variants = adaptVariantMapForInstrument(shape?.drop2Variants, sourceStart, sourceEnd, sourceCount);
  const dragPlacementStarts = dragPlacementVariants
    ? Object.values(dragPlacementVariants)
        .map((variant) => Number(variant?.stringSetStart))
        .filter((value) => Number.isFinite(value))
        .sort((a, b) => a - b)
    : undefined;
  const drop2StringSetStarts = drop2Variants
    ? Object.values(drop2Variants)
        .map((variant) => Number(variant?.stringSetStart))
        .filter((value) => Number.isFinite(value))
        .sort((a, b) => a - b)
    : undefined;

  return {
    ...shape,
    anchorString: adaptedMain.anchorString,
    anchorLabel: getStringLabelByCount(adaptedMain.anchorString, sourceCount),
    positions: adaptedMain.positions,
    dragPlacementStarts: dragPlacementStarts?.length ? Array.from(new Set(dragPlacementStarts)) : undefined,
    dragPlacementVariants: dragPlacementVariants ?? undefined,
    drop2StringSetStarts: drop2StringSetStarts?.length ? Array.from(new Set(drop2StringSetStarts)) : undefined,
    drop2Variants: drop2Variants ?? undefined,
    anchorHintLabel: undefined,
  };
}

function isThreeNpsShape(shape) {
  const id = `${shape?.id ?? ""}`.toLowerCase();
  const mode = `${shape?.mode ?? ""}`.toLowerCase();
  const system = `${shape?.system ?? ""}`.toLowerCase();
  const sectionId = `${shape?.sectionId ?? ""}`.toLowerCase();
  const categoryId = `${shape?.categoryId ?? ""}`.toLowerCase();

  return (
    system.includes("3nps") ||
    mode.includes("3nps") ||
    id.includes("3nps") ||
    sectionId.includes("3nps") ||
    sectionId.includes("major-scale-3nps") ||
    sectionId.includes("melodic-minor-3nps") ||
    sectionId.includes("harmonic-minor-3nps") ||
    categoryId === "three-nps"
  );
}

function isDrop3Shape(shape) {
  const id = `${shape?.id ?? ""}`.toLowerCase();
  const mode = `${shape?.mode ?? ""}`.toLowerCase();
  const system = `${shape?.system ?? ""}`.toLowerCase();
  const sectionId = `${shape?.sectionId ?? ""}`.toLowerCase();
  const categoryId = `${shape?.categoryId ?? ""}`.toLowerCase();

  return (
    system.includes("drop 3") ||
    mode.includes("drop 3") ||
    id.startsWith("drop3_") ||
    id.includes("_drop3_") ||
    sectionId.startsWith("drop3-") ||
    sectionId.includes("drop3") ||
    categoryId === "drop3"
  );
}

function isDrop2Shape(shape) {
  const id = `${shape?.id ?? ""}`.toLowerCase();
  const mode = `${shape?.mode ?? ""}`.toLowerCase();
  const system = `${shape?.system ?? ""}`.toLowerCase();
  const sectionId = `${shape?.sectionId ?? ""}`.toLowerCase();
  const categoryId = `${shape?.categoryId ?? ""}`.toLowerCase();

  return (
    system.includes("drop 2") ||
    mode.includes("drop 2") ||
    id.startsWith("drop2_") ||
    id.includes("_drop2_") ||
    sectionId.startsWith("drop2-") ||
    sectionId.includes("drop2") ||
    categoryId === "drop2"
  );
}

function isBassExcludedShape(shape) {
  const id = `${shape?.id ?? ""}`.toLowerCase();
  return id === "dim7_chord_root_5" || id === "dim7_chord_root_4";
}

function isUkuleleExcludedShape(shape) {
  const id = `${shape?.id ?? ""}`.toLowerCase();
  const categoryId = `${shape?.categoryId ?? ""}`.toLowerCase();
  return (
    categoryId === "triads" ||
    categoryId === "sus-chords" ||
    id === "dim7_chord_root_5" ||
    id === "dim7_chord_root_6"
  );
}

function getActiveShapes() {
  const instrument = getActiveInstrument();
  if (instrument.id === "guitar" && instrument.sourceStringStart === 0 && instrument.sourceStringCount === 6) {
    return GUITAR_SCALE_SHAPES;
  }

  const cacheKey = `${instrument.cacheKey ?? instrument.id}`;
  if (instrumentShapeCache.has(cacheKey)) {
    return instrumentShapeCache.get(cacheKey);
  }

  const adapted = GUITAR_SCALE_SHAPES.map((shape) => adaptShapeForInstrument(shape, instrument)).filter(Boolean);
  let filtered = adapted;
  if (instrument.id === "bass") {
    filtered = adapted.filter((shape) => !isThreeNpsShape(shape) && !isDrop3Shape(shape) && !isBassExcludedShape(shape));
  } else if (instrument.id === "ukulele") {
    filtered = adapted.filter(
      (shape) => !isDrop2Shape(shape) && !isDrop3Shape(shape) && !isUkuleleExcludedShape(shape)
    );
  }
  instrumentShapeCache.set(cacheKey, filtered);
  return filtered;
}

function buildSketchInlayDot(cx, cy, r, seedBase) {
  const fillCx = cx + sketchJitter(seedBase + 1, 0.5);
  const fillCy = cy + sketchJitter(seedBase + 2, 0.5);
  const fillRx = r + sketchJitter(seedBase + 3, 0.45);
  const fillRy = r + sketchJitter(seedBase + 4, 0.45);

  const outline1Cx = cx + sketchJitter(seedBase + 11, 0.75);
  const outline1Cy = cy + sketchJitter(seedBase + 12, 0.75);
  const outline1Rx = r + sketchJitter(seedBase + 13, 0.7);
  const outline1Ry = r + sketchJitter(seedBase + 14, 0.7);

  const outline2Cx = cx + sketchJitter(seedBase + 21, 0.75);
  const outline2Cy = cy + sketchJitter(seedBase + 22, 0.75);
  const outline2Rx = r + sketchJitter(seedBase + 23, 0.7);
  const outline2Ry = r + sketchJitter(seedBase + 24, 0.7);

  return `
    <ellipse class="fret-inlay-dot fret-inlay-dot--fill" cx="${fillCx}" cy="${fillCy}" rx="${Math.max(
      0.5,
      fillRx
    )}" ry="${Math.max(0.5, fillRy)}"></ellipse>
    <ellipse class="fret-inlay-dot fret-inlay-dot--stroke" cx="${outline1Cx}" cy="${outline1Cy}" rx="${Math.max(
      0.5,
      outline1Rx
    )}" ry="${Math.max(0.5, outline1Ry)}"></ellipse>
    <ellipse class="fret-inlay-dot fret-inlay-dot--stroke" cx="${outline2Cx}" cy="${outline2Cy}" rx="${Math.max(
      0.5,
      outline2Rx
    )}" ry="${Math.max(0.5, outline2Ry)}"></ellipse>
  `;
}

function createFretboardInlays(fretStart, fretEnd, fretWidth) {
  const bottomString = 0;
  const topString = getStringCount() - 1;
  const centerY = (getStringY(bottomString) + getStringY(topString)) / 2;
  const dotRadius = Math.min(9.5, getStringSpacing() * 0.18);
  const lerp = (a, b, t) => a + (b - a) * t;
  const yUpper = lerp(getStringY(topString), getStringY(bottomString), 0.35);
  const yLower = lerp(getStringY(topString), getStringY(bottomString), 0.65);
  const inlays = [];

  for (let fret = fretStart; fret <= fretEnd; fret += 1) {
    const centerX = getFretX(fret) + fretWidth / 2;
    if (FRET_MARKER_SINGLE_FRETS.has(fret)) {
      inlays.push(
        `<g class="fret-inlay-group" data-fret="${fret}">${buildSketchInlayDot(
          centerX,
          centerY,
          dotRadius,
          3000 + fret * 31
        )}</g>`
      );
      continue;
    }
    if (FRET_MARKER_DOUBLE_FRETS.has(fret)) {
      inlays.push(
        `<g class="fret-inlay-group fret-inlay-group--double" data-fret="${fret}">
          ${buildSketchInlayDot(centerX, yUpper, dotRadius * 0.95, 4000 + fret * 41)}
          ${buildSketchInlayDot(centerX, yLower, dotRadius * 0.95, 5000 + fret * 41)}
        </g>`
      );
    }
  }

  return inlays.join("");
}

function normalizeUiLanguage(lang) {
  const normalized = `${lang ?? ""}`.toLowerCase();
  return UI_LANGUAGES.has(normalized) ? normalized : null;
}

function detectBrowserUiLanguage() {
  const languages = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
    navigator.userLanguage,
  ]
    .filter(Boolean)
    .map((value) => `${value}`.toLowerCase());
  if (languages.some((value) => value.includes("hant") || value.startsWith("zh-tw") || value.startsWith("zh-hk") || value.startsWith("zh-mo"))) {
    return "zh-hant";
  }
  return languages.some((value) => value.startsWith("zh")) ? "zh" : "en";
}

function sanitizeCustomStringCount(value) {
  return Math.max(1, Math.round(Number(value) || STANDARD_GUITAR_TUNING.length));
}

function normalizeTuningNoteName(value) {
  const raw = `${value ?? ""}`.trim();
  if (!raw) {
    return "";
  }
  const match = raw.match(/^([A-Ga-g])([#bB]{0,2})$/);
  if (!match) {
    return "";
  }
  const letter = match[1].toUpperCase();
  const accidental = (match[2] || "")
    .split("")
    .map((char) => (char === "#" ? "#" : "b"))
    .join("");
  const normalized = `${letter}${accidental}`;
  return Number.isFinite(getNoteIndex(normalized)) ? normalized : "";
}

function buildDefaultCustomTuning(count = STANDARD_GUITAR_TUNING.length) {
  const targetCount = sanitizeCustomStringCount(count);
  const tuning = [...STANDARD_GUITAR_TUNING];
  let lowestNote = tuning[0];
  while (tuning.length < targetCount) {
    const lowestIndex = getNoteIndex(lowestNote);
    lowestNote = getNoteName(lowestIndex - 5, "sharps");
    tuning.unshift(lowestNote);
  }
  return tuning.slice(-targetCount);
}

function resizeCustomTuningDraft(tuning, nextCount) {
  const current = Array.isArray(tuning) ? tuning.map((note) => normalizeTuningNoteName(note) || "") : [];
  const targetCount = sanitizeCustomStringCount(nextCount);
  if (current.length === targetCount) {
    return current;
  }
  if (current.length > targetCount) {
    return current.slice(current.length - targetCount);
  }
  const next = [...current];
  let lowestNote = normalizeTuningNoteName(next[0]) || buildDefaultCustomTuning(1)[0];
  while (next.length < targetCount) {
    const lowestIndex = getNoteIndex(lowestNote);
    lowestNote = getNoteName(lowestIndex - 5, "sharps");
    next.unshift(lowestNote);
  }
  return next;
}

function getPreferredAccidentalFromNoteName(noteName) {
  return `${noteName ?? ""}`.includes("b") ? "flats" : "sharps";
}

function shiftNoteNameBySemitones(noteName, semitones) {
  const normalized = normalizeTuningNoteName(noteName);
  if (!normalized) {
    return "";
  }
  const nextIndex = getNoteIndex(normalized) + Number(semitones || 0);
  return getNoteName(nextIndex, getPreferredAccidentalFromNoteName(normalized));
}

function calculateIntervalsFromTuning(tuning) {
  const normalized = (tuning ?? []).map((note) => normalizeTuningNoteName(note));
  const intervals = [];
  for (let index = 0; index < normalized.length - 1; index += 1) {
    const current = normalized[index];
    const next = normalized[index + 1];
    if (!current || !next) {
      intervals.push(5);
      continue;
    }
    const delta = ((getNoteIndex(next) - getNoteIndex(current)) % 12 + 12) % 12 || 12;
    intervals.push(delta);
  }
  return intervals;
}

function buildTuningFromIntervals(lowestNote, intervals) {
  const first = normalizeTuningNoteName(lowestNote) || buildDefaultCustomTuning(1)[0];
  const tuning = [first];
  for (const interval of intervals ?? []) {
    tuning.push(shiftNoteNameBySemitones(tuning[tuning.length - 1], interval) || tuning[tuning.length - 1]);
  }
  return tuning;
}

function getMidiCandidatesForNoteName(noteName) {
  const noteIndex = getNoteIndex(noteName);
  if (!Number.isFinite(noteIndex)) {
    return [];
  }
  const candidates = [];
  for (let midi = noteIndex; midi <= 127; midi += 12) {
    candidates.push(midi);
  }
  return candidates;
}

function chooseMidiCandidate(noteName, targetMidi, { minExclusive = -1 } = {}) {
  const candidates = getMidiCandidatesForNoteName(noteName).filter((midi) => midi > minExclusive && midi >= 12);
  if (!candidates.length) {
    return Math.max(12, Math.min(127, Math.round(targetMidi || 40)));
  }
  return candidates.sort((a, b) => Math.abs(a - targetMidi) - Math.abs(b - targetMidi) || a - b)[0];
}

function deriveOpenMidiFromTuning(tuning, referenceOpenMidi = []) {
  const openMidi = [];
  let previous = -1;
  tuning.forEach((noteName, index) => {
    const target =
      Number.isFinite(referenceOpenMidi?.[index]) ? Number(referenceOpenMidi[index]) : previous >= 0 ? previous + 5 : 40;
    const midi = chooseMidiCandidate(noteName, target, { minExclusive: previous });
    openMidi.push(midi);
    previous = midi;
  });
  return openMidi;
}

function normalizeCustomInstrumentConfig(config, fallbackConfig = null) {
  const fallback =
    fallbackConfig && Array.isArray(fallbackConfig.tuning) && fallbackConfig.tuning.length
      ? fallbackConfig
      : { tuning: STANDARD_GUITAR_TUNING, openMidi: STANDARD_GUITAR_OPEN_MIDI };
  const rawTuning = Array.isArray(config?.tuning) && config.tuning.length ? config.tuning : fallback.tuning;
  const tuning = rawTuning
    .map((note) => normalizeTuningNoteName(note))
    .filter(Boolean)
    .slice();
  const normalizedTuning = tuning.length ? tuning : [...fallback.tuning];
  const referenceOpenMidi = Array.isArray(config?.openMidi) && config.openMidi.length ? config.openMidi : fallback.openMidi;
  return {
    tuning: normalizedTuning,
    openMidi: deriveOpenMidiFromTuning(normalizedTuning, referenceOpenMidi),
  };
}

function getInitialCustomInstrumentConfig() {
  try {
    const raw = localStorage.getItem(CUSTOM_INSTRUMENT_STORAGE_KEY);
    if (!raw) {
      return normalizeCustomInstrumentConfig({ tuning: STANDARD_GUITAR_TUNING, openMidi: STANDARD_GUITAR_OPEN_MIDI });
    }
    return normalizeCustomInstrumentConfig(JSON.parse(raw));
  } catch {
    return normalizeCustomInstrumentConfig({ tuning: STANDARD_GUITAR_TUNING, openMidi: STANDARD_GUITAR_OPEN_MIDI });
  }
}

function persistCustomInstrumentConfig(config) {
  try {
    localStorage.setItem(CUSTOM_INSTRUMENT_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage errors
  }
}

function getCustomStringSpacing(stringCount) {
  return DIMENSIONS.stringSpacing;
}

function findBestCustomSourceStart(tuning, sourceCount) {
  const target = Array.isArray(tuning) ? tuning.slice(-sourceCount) : [];
  if (!target.length) {
    return 0;
  }
  let bestStart = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let start = 0; start <= STANDARD_GUITAR_TUNING.length - sourceCount; start += 1) {
    let score = 0;
    for (let index = 0; index < sourceCount; index += 1) {
      const targetIndex = getNoteIndex(target[index]);
      const sourceIndex = getNoteIndex(STANDARD_GUITAR_TUNING[start + index]);
      score += targetIndex === sourceIndex ? 0 : 1;
    }
    if (score < bestScore) {
      bestScore = score;
      bestStart = start;
    }
  }
  return bestStart;
}

function buildCustomSourceWindows(tuning) {
  const stringCount = Array.isArray(tuning) ? tuning.length : STANDARD_GUITAR_TUNING.length;
  const sourceCount = Math.min(STANDARD_GUITAR_TUNING.length, Math.max(1, stringCount));
  if (stringCount <= STANDARD_GUITAR_TUNING.length) {
    const sourceStart = findBestCustomSourceStart(tuning, sourceCount);
    return [{ sourceStart, targetStart: 0, sourceCount }];
  }
  return Array.from({ length: stringCount - STANDARD_GUITAR_TUNING.length + 1 }, (_, targetStart) => ({
    sourceStart: 0,
    targetStart,
    sourceCount: STANDARD_GUITAR_TUNING.length,
  }));
}

function getCustomInstrumentConfigSignature(config) {
  const normalized = normalizeCustomInstrumentConfig(config);
  return `${normalized.tuning.join(",")}|${normalized.openMidi.join(",")}`;
}

function buildCustomInstrumentDefinition(config) {
  const normalized = normalizeCustomInstrumentConfig(config);
  const sourceWindows = buildCustomSourceWindows(normalized.tuning);
  const primaryWindow = sourceWindows[0] ?? { sourceStart: 0, targetStart: 0, sourceCount: normalized.tuning.length };
  return {
    id: CUSTOM_INSTRUMENT_ID,
    tuning: normalized.tuning,
    openMidi: normalized.openMidi,
    stringSpacing: getCustomStringSpacing(normalized.tuning.length),
    sourceStringStart: primaryWindow.sourceStart,
    sourceStringCount: primaryWindow.sourceCount,
    sourceWindows,
    cacheKey: `${CUSTOM_INSTRUMENT_ID}:${getCustomInstrumentConfigSignature(normalized)}`,
  };
}

function normalizeInstrumentId(instrumentId) {
  const normalized = `${instrumentId ?? ""}`.trim().toLowerCase();
  return VALID_INSTRUMENT_IDS.has(normalized) ? normalized : "guitar";
}

function normalizeGuitarTone(tone) {
  const normalized = `${tone ?? ""}`.trim().toLowerCase();
  return GUITAR_TONES.has(normalized) ? normalized : "classical";
}

function normalizeLabelMode(mode) {
  const normalized = `${mode ?? ""}`.trim().toLowerCase();
  return LABEL_MODES.has(normalized) ? normalized : "fixed";
}

function normalizeMovableDoRoot(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? mod12(Math.round(numeric)) : 0;
}

function getActiveInstrument() {
  const instrumentId = normalizeInstrumentId(state.instrumentId);
  if (instrumentId === CUSTOM_INSTRUMENT_ID) {
    return buildCustomInstrumentDefinition(state.customInstrumentConfig);
  }
  return INSTRUMENTS[instrumentId] ?? INSTRUMENTS.guitar;
}

function getActiveTuning() {
  return getActiveInstrument().tuning;
}

function getActiveOpenMidi() {
  return getActiveInstrument().openMidi;
}

function getStringCount() {
  return getActiveTuning().length;
}

function getStringLabelByCount(stringIndex, count) {
  const stringNumber = count - Number(stringIndex);
  if (!Number.isFinite(stringNumber) || stringNumber < 1) {
    return "";
  }
  if (stringNumber === 1) return "1st";
  if (stringNumber === 2) return "2nd";
  if (stringNumber === 3) return "3rd";
  return `${stringNumber}th`;
}

function getStringLabel(stringIndex) {
  return getStringLabelByCount(stringIndex, getStringCount());
}

function getInitialUiLanguage() {
  try {
    const saved = normalizeUiLanguage(localStorage.getItem(UI_LANGUAGE_STORAGE_KEY));
    if (saved) {
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  return detectBrowserUiLanguage() || "zh";
}

function getInitialInstrumentId() {
  try {
    const saved = normalizeInstrumentId(localStorage.getItem(INSTRUMENT_STORAGE_KEY));
    return saved || "guitar";
  } catch {
    return "guitar";
  }
}

function getInitialGuitarTone() {
  try {
    return normalizeGuitarTone(localStorage.getItem(GUITAR_TONE_STORAGE_KEY));
  } catch {
    return "classical";
  }
}

function getInitialLabelMode() {
  try {
    return normalizeLabelMode(localStorage.getItem(LABEL_MODE_STORAGE_KEY));
  } catch {
    return "fixed";
  }
}

function getInitialMovableDoRoot() {
  try {
    return normalizeMovableDoRoot(localStorage.getItem(MOVABLE_DO_ROOT_STORAGE_KEY));
  } catch {
    return 0;
  }
}

function t(key, vars = {}) {
  const langPack = UI_TEXT[state.language] ?? UI_TEXT.zh;
  const template = langPack[key] ?? UI_TEXT.zh[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, token) => `${vars[token] ?? ""}`);
}

function formatCount(count) {
  return t("count.items", { count });
}

function showUiToast(message, tone = "default") {
  if (!message) {
    return;
  }
  const existing = document.getElementById("icFretlabToast");
  if (existing) {
    existing.remove();
  }
  const toast = document.createElement("div");
  toast.id = "icFretlabToast";
  const isError = tone === "error";
  const isSuccess = tone === "success";
  const background = isError ? "#7f1d1d" : isSuccess ? "#14532d" : "#1f2937";
  toast.style.cssText = [
    "position:fixed",
    "right:20px",
    "bottom:20px",
    "z-index:12000",
    "max-width:360px",
    `background:${background}`,
    "color:#fff",
    "border-radius:10px",
    "padding:10px 12px",
    "font-size:13px",
    "line-height:1.45",
    "box-shadow:0 12px 28px rgba(0,0,0,.28)",
  ].join(";");
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 2600);
}

function refreshAccessUi() {
  if (dom.licenseStatusBanner) {
    if (state.isFullAccess) {
      dom.licenseStatusBanner.textContent = "";
      dom.licenseStatusBanner.style.display = "none";
    } else {
      dom.licenseStatusBanner.textContent = t("license.status.trial");
      dom.licenseStatusBanner.style.display = "";
    }
  }
  dom.paletteToggleBtn?.classList.toggle("is-locked", !state.isFullAccess);
  dom.exportToggleBtn?.classList.toggle("is-locked", !state.isFullAccess);
  dom.videoRenderBtn?.classList.toggle("is-locked", !state.isFullAccess);
}

function populateMovableDoRootOptions() {
  if (!dom.movableDoRootSelect) {
    return;
  }
  const currentValue = `${normalizeMovableDoRoot(state.movableDoRoot)}`;
  dom.movableDoRootSelect.innerHTML = Array.from({ length: 12 }, (_, noteIndex) => {
    const label = getNoteName(noteIndex, state.notePreference);
    return `<option value="${noteIndex}">${escapeHtml(label)}</option>`;
  }).join("");
  dom.movableDoRootSelect.value = currentValue;
}

function syncLabelModeControls() {
  const normalizedMode = normalizeLabelMode(state.labelMode);
  state.labelMode = normalizedMode;
  if (dom.labelModeSelect) {
    dom.labelModeSelect.value = normalizedMode;
  }
  const shouldShowMovableDoRoot = normalizedMode === "movable-do";
  if (dom.movableDoRootWrap) {
    dom.movableDoRootWrap.hidden = !shouldShowMovableDoRoot;
    dom.movableDoRootWrap.style.display = shouldShowMovableDoRoot ? "" : "none";
    dom.movableDoRootWrap.setAttribute("aria-hidden", shouldShowMovableDoRoot ? "false" : "true");
  }
  if (dom.movableDoRootSelect) {
    dom.movableDoRootSelect.disabled = !shouldShowMovableDoRoot;
  }
  populateMovableDoRootOptions();
}

function refreshDisplayedNoteLabels() {
  syncLabelModeControls();
  renderGrid();
  renderMarkers();
  renderOverlays();
  renderRealtimeMarkers();
  buildShapeLibrary();
}

function ensureFullAccess(featureKey) {
  if (state.isFullAccess) {
    return true;
  }
  let messageKey = "license.locked.export";
  if (featureKey === "library") {
    messageKey = "license.locked.library";
  } else if (featureKey === "video") {
    messageKey = "license.locked.video";
  }
  showUiToast(t(messageKey), "error");
  return false;
}

function applyTranslations() {
  document.documentElement.lang =
    state.language === "zh" ? "zh-Hans" : state.language === "zh-hant" ? "zh-Hant" : "en";
  document.title = t("meta.title");

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (!key) {
      return;
    }
    element.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    if (!key || !("placeholder" in element)) {
      return;
    }
    element.placeholder = t(key);
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    const key = element.dataset.i18nAriaLabel;
    if (!key) {
      return;
    }
    element.setAttribute("aria-label", t(key));
  });

  dom.languageSwitch?.querySelectorAll("[data-ui-lang]").forEach((button) => {
    const lang = button.dataset.uiLang;
    const isActive = lang === state.language;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  if (dom.paletteCloseBtn) {
    dom.paletteCloseBtn.setAttribute("aria-label", t("palette.close.aria"));
  }

  syncLabelModeControls();
  syncVideoRendererUi();
  syncHelpModalUi();
  refreshAccessUi();
  syncInstrumentControls();
  if (state.customInstrumentModalOpen) {
    renderCustomIntervalFields();
    renderCustomTuningFields();
  }
}

function shouldUseMobileBoardToolbarPlacement() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(MOBILE_LAYOUT_MEDIA_QUERY).matches
    : false;
}

function syncBoardInlineControlsPlacement() {
  if (!dom.boardInlineControls || !dom.mobileBoardInlineControlsSlot || !dom.boardPanel) {
    return;
  }
  if (shouldUseMobileBoardToolbarPlacement()) {
    if (dom.boardInlineControls.parentElement !== dom.mobileBoardInlineControlsSlot) {
      dom.mobileBoardInlineControlsSlot.appendChild(dom.boardInlineControls);
    }
    return;
  }
  const boardFretboard = dom.boardPanel.querySelector(".board-panel__fretboard");
  if (boardFretboard && dom.boardInlineControls.parentElement !== boardFretboard) {
    boardFretboard.appendChild(dom.boardInlineControls);
  }
}

function setPaletteOpen(nextOpen) {
  const isOpen = Boolean(nextOpen);
  state.paletteOpen = isOpen;
  dom.boardPanel?.classList.toggle("is-shifted-by-palette", isOpen);
  dom.paletteDrawer?.classList.toggle("is-open", isOpen);
  dom.paletteBackdrop?.classList.toggle("is-open", isOpen);
  if (!isOpen) {
    dom.paletteBackdrop?.classList.remove("is-drag-pass-through");
    if (touchShapeDrag.active) {
      resetTouchShapeDrag({ clearPreview: true });
    }
  }
  dom.paletteDrawer?.setAttribute("aria-hidden", isOpen ? "false" : "true");
  dom.paletteBackdrop?.setAttribute("aria-hidden", isOpen ? "false" : "true");
  if (dom.paletteToggleBtn) {
    dom.paletteToggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    dom.paletteToggleBtn.classList.toggle("is-active", isOpen);
  }
}

function togglePalette() {
  if (!ensureFullAccess("library")) {
    return;
  }
  setPaletteOpen(!state.paletteOpen);
}

function setExportMenuOpen(nextOpen) {
  const isOpen = Boolean(nextOpen);
  state.exportMenuOpen = isOpen;
  dom.exportMenu?.classList.toggle("is-open", isOpen);
  dom.exportMenu?.setAttribute("aria-hidden", isOpen ? "false" : "true");
  if (dom.exportToggleBtn) {
    dom.exportToggleBtn.classList.toggle("is-active", isOpen);
    dom.exportToggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }
}

function toggleExportMenu() {
  if (!ensureFullAccess("export")) {
    return;
  }
  setExportMenuOpen(!state.exportMenuOpen);
}

function setVideoStatus(statusKey, vars = {}, tone = "default") {
  videoRenderer.statusKey = statusKey;
  videoRenderer.statusVars = vars;
  const message = t(statusKey, vars);
  if (!dom.videoRenderStatus) {
    if (tone === "error" || tone === "success" || statusKey === "video.status.busy") {
      showUiToast(message, tone);
    }
    return;
  }
  dom.videoRenderStatus.textContent = message;
  dom.videoRenderStatus.classList.toggle("is-error", tone === "error");
  dom.videoRenderStatus.classList.toggle("is-success", tone === "success");
}

function clearVideoProgressTimer() {
  if (videoRenderer.progressTimer) {
    clearInterval(videoRenderer.progressTimer);
    videoRenderer.progressTimer = null;
  }
}

function clearVideoProgressResetTimer() {
  if (videoRenderer.progressResetTimer) {
    clearTimeout(videoRenderer.progressResetTimer);
    videoRenderer.progressResetTimer = null;
  }
}

function setVideoProgress(value, { active = videoRenderer.progressActive, sync = true } = {}) {
  videoRenderer.progressValue = Math.max(0, Math.min(100, Number(value || 0)));
  videoRenderer.progressActive = Boolean(active);
  if (sync) {
    syncVideoRendererUi();
  }
}

function setVideoProgressPhase(phase) {
  videoRenderer.progressPhase = `${phase || "idle"}`;
}

function startVideoProgressTimer() {
  if (videoRenderer.progressTimer) {
    return;
  }
  videoRenderer.progressTimer = setInterval(() => {
    if (!videoRenderer.busy) {
      return;
    }
    const phase = videoRenderer.progressPhase;
    let cap = 95;
    let minStep = 0.2;
    let maxStep = 0.8;
    if (phase === "bridge") {
      cap = 18;
      minStep = 1.0;
      maxStep = 2.4;
    } else if (phase === "reading") {
      cap = 34;
      minStep = 0.6;
      maxStep = 1.8;
    } else if (phase === "rendering") {
      cap = 96;
      minStep = 0.18;
      maxStep = 0.72;
    }
    if (videoRenderer.progressValue >= cap) {
      return;
    }
    const next = videoRenderer.progressValue + minStep + Math.random() * (maxStep - minStep);
    setVideoProgress(Math.min(cap, next), { active: true });
  }, 220);
}

function finishVideoProgress(success) {
  clearVideoProgressTimer();
  clearVideoProgressResetTimer();
  setVideoProgressPhase("idle");

  if (!success) {
    setVideoProgress(0, { active: false });
    return;
  }

  setVideoProgress(100, { active: true });
  videoRenderer.progressResetTimer = setTimeout(() => {
    if (videoRenderer.busy) {
      return;
    }
    setVideoProgress(0, { active: false });
    videoRenderer.progressResetTimer = null;
  }, 900);
}

function syncVideoRendererUi() {
  if (dom.videoGenerateBtn) {
    dom.videoGenerateBtn.disabled = !videoRenderer.file || Boolean(videoRenderer.fileValidationErrorKey) || videoRenderer.busy;
  }
  if (dom.videoModalCloseBtn) {
    dom.videoModalCloseBtn.disabled = videoRenderer.busy;
  }
  if (dom.videoCancelBtn) {
    dom.videoCancelBtn.disabled = videoRenderer.busy;
  }
  if (dom.videoDropZone) {
    dom.videoDropZone.setAttribute("aria-disabled", videoRenderer.busy ? "true" : "false");
  }
  if (dom.videoRenderBtn) {
    dom.videoRenderBtn.classList.toggle("is-active", state.videoModalOpen);
    dom.videoRenderBtn.setAttribute("aria-expanded", state.videoModalOpen ? "true" : "false");
  }
  if (dom.videoRenderStatus) {
    dom.videoRenderStatus.textContent = t(videoRenderer.statusKey, videoRenderer.statusVars);
  }
  if (dom.videoProgressWrap) {
    const shouldShow = videoRenderer.progressActive && (videoRenderer.busy || videoRenderer.progressValue > 0);
    dom.videoProgressWrap.classList.toggle("is-active", shouldShow);
    dom.videoProgressWrap.setAttribute("aria-hidden", shouldShow ? "false" : "true");
  }
  if (dom.videoProgressBar) {
    dom.videoProgressBar.style.width = `${Math.round(videoRenderer.progressValue)}%`;
  }
  if (dom.videoProgressText) {
    dom.videoProgressText.textContent = `${Math.round(videoRenderer.progressValue)}%`;
  }
}

function syncHelpModalUi() {
  if (dom.helpToggleBtn) {
    dom.helpToggleBtn.classList.toggle("is-active", state.helpModalOpen);
    dom.helpToggleBtn.setAttribute("aria-expanded", state.helpModalOpen ? "true" : "false");
  }
}

function setVideoModalOpen(nextOpen) {
  const isOpen = Boolean(nextOpen);
  if (isOpen && state.exportMenuOpen) {
    setExportMenuOpen(false);
  }
  state.videoModalOpen = isOpen;
  if (!isOpen && !videoRenderer.busy) {
    clearVideoProgressTimer();
    clearVideoProgressResetTimer();
    setVideoProgressPhase("idle");
    setVideoProgress(0, { active: false, sync: false });
  }
  dom.videoModal?.classList.toggle("is-open", isOpen);
  dom.videoModalBackdrop?.classList.toggle("is-open", isOpen);
  dom.videoModal?.setAttribute("aria-hidden", isOpen ? "false" : "true");
  dom.videoModalBackdrop?.setAttribute("aria-hidden", isOpen ? "false" : "true");
  syncVideoRendererUi();
}

function toggleVideoModal() {
  if (!ensureFullAccess("video")) {
    return;
  }
  setVideoModalOpen(!state.videoModalOpen);
}

function setHelpModalOpen(nextOpen) {
  const isOpen = Boolean(nextOpen);
  if (isOpen && state.exportMenuOpen) {
    setExportMenuOpen(false);
  }
  state.helpModalOpen = isOpen;
  dom.helpModal?.classList.toggle("is-open", isOpen);
  dom.helpModalBackdrop?.classList.toggle("is-open", isOpen);
  dom.helpModal?.setAttribute("aria-hidden", isOpen ? "false" : "true");
  dom.helpModalBackdrop?.setAttribute("aria-hidden", isOpen ? "false" : "true");
  syncHelpModalUi();
}

function toggleHelpModal() {
  setHelpModalOpen(!state.helpModalOpen);
}

function getFileExtension(name = "") {
  const parts = `${name}`.toLowerCase().split(".");
  if (parts.length < 2) {
    return "";
  }
  return parts.pop() || "";
}

function isSupportedUploadFile(file) {
  if (!file || !file.name) {
    return false;
  }
  return VIDEO_ALLOWED_EXTENSIONS.has(getFileExtension(file.name));
}

function validateUploadFile(file) {
  if (!file) {
    return null;
  }
  if (!isSupportedUploadFile(file)) {
    return "video.status.invalidType";
  }
  if (Number(file.size || 0) > VIDEO_MAX_FILE_SIZE_BYTES) {
    return "video.status.invalidSize";
  }
  return null;
}

function setVideoSelectedFile(file) {
  videoRenderer.file = file || null;
  videoRenderer.fileValidationErrorKey = validateUploadFile(videoRenderer.file);
  if (!videoRenderer.busy) {
    clearVideoProgressTimer();
    clearVideoProgressResetTimer();
    setVideoProgressPhase("idle");
    setVideoProgress(0, { active: false, sync: false });
  }
  if (!videoRenderer.file) {
    setVideoStatus("video.status.idle");
  } else if (videoRenderer.fileValidationErrorKey) {
    setVideoStatus(videoRenderer.fileValidationErrorKey, {}, "error");
  } else {
    setVideoStatus("video.status.idle");
  }
  syncVideoRendererUi();
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = `${reader.result || ""}`;
      const delimiterIdx = result.indexOf(",");
      resolve(delimiterIdx >= 0 ? result.slice(delimiterIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error("read_file_failed"));
    reader.readAsDataURL(file);
  });
}

function delayMs(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, Number(ms || 0)));
  });
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  if (typeof AbortController !== "function") {
    return fetch(url, options);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, Math.max(250, Number(timeoutMs || 0)));
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function isBridgeReachable() {
  try {
    const response = await fetchWithTimeout(
      `${BRIDGE_HTTP_BASE}/health`,
      { method: "GET", cache: "no-store" },
      BRIDGE_HEALTHCHECK_TIMEOUT_MS
    );
    return response.ok;
  } catch {
    return false;
  }
}

function canBootstrapBridgeFromCurrentHost() {
  const origin = typeof window !== "undefined" ? window.location?.origin || "" : "";
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(origin);
}

async function requestBridgeBootstrapFromHost() {
  if (!canBootstrapBridgeFromCurrentHost()) {
    return false;
  }

  const endpointUrl = `${window.location.origin}${BRIDGE_BOOTSTRAP_ENDPOINT}`;
  const response = await fetchWithTimeout(
    endpointUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    },
    BRIDGE_AUTOSTART_TIMEOUT_MS
  );

  if (!response.ok) {
    let reason = `${response.status} ${response.statusText}`.trim();
    try {
      const payload = await response.json();
      if (payload?.error) {
        reason = `${payload.error}`;
      }
    } catch {
      // ignore parse failure
    }
    throw new Error(reason || "failed_to_bootstrap_bridge");
  }

  try {
    const payload = await response.json();
    if (payload && payload.ok === false) {
      throw new Error(payload.error || "failed_to_bootstrap_bridge");
    }
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }
  }

  return true;
}

async function ensureBridgeReadyForRender() {
  if (await isBridgeReachable()) {
    return;
  }

  try {
    const bootstrapTriggered = await requestBridgeBootstrapFromHost();
    if (bootstrapTriggered) {
      const deadline = Date.now() + BRIDGE_AUTOSTART_TIMEOUT_MS;
      while (Date.now() < deadline) {
        if (await isBridgeReachable()) {
          return;
        }
        await delayMs(300);
      }
    }
  } catch {
    // fallback to unified error below
  }

  throw new Error("bridge_unreachable");
}

function getFilenameFromDisposition(disposition, fallback = "fretlab-animation.mp4") {
  if (!disposition) {
    return fallback;
  }
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const simpleMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
  if (simpleMatch?.[1]) {
    return simpleMatch[1];
  }
  return fallback;
}

function normalizeRenderErrorReason(reason = "") {
  const text = `${reason || ""}`.trim();
  if (!text) {
    return "Unknown error";
  }
  if (/bridge_unreachable|failed to fetch|networkerror|fetch failed/i.test(text)) {
    return state.language === "zh"
      ? "无法连接本地渲染服务（127.0.0.1:3210）。请使用 `npm run localhost` 启动工具，或先手动启动 Bridge 服务。"
      : "Cannot reach local render bridge (127.0.0.1:3210). Start FretLab with `npm run localhost`, or start the bridge service first.";
  }
  if (/read_file_failed/i.test(text)) {
    return state.language === "zh" ? "文件读取失败，请重新选择文件。" : "Failed to read file. Please re-select the file.";
  }
  if (text.length <= 180) {
    return text;
  }
  return `${text.slice(0, 177)}...`;
}

async function handleVideoGenerate() {
  if (videoRenderer.busy) {
    setVideoStatus("video.status.busy");
    syncVideoRendererUi();
    return;
  }
  const file = videoRenderer.file;
  const validationError = validateUploadFile(file);
  if (validationError) {
    videoRenderer.fileValidationErrorKey = validationError;
    setVideoStatus(validationError, {}, "error");
    syncVideoRendererUi();
    return;
  }

  let renderSucceeded = false;
  try {
    videoRenderer.busy = true;
    clearVideoProgressResetTimer();
    setVideoProgress(4, { active: true, sync: false });
    setVideoProgressPhase("bridge");
    startVideoProgressTimer();
    setVideoStatus("video.status.startingBridge");
    syncVideoRendererUi();
    await ensureBridgeReadyForRender();

    setVideoProgress(Math.max(videoRenderer.progressValue, 22), { active: true, sync: false });
    setVideoProgressPhase("reading");
    setVideoStatus("video.status.reading");
    syncVideoRendererUi();
    const fileBase64 = await readFileAsBase64(file);

    setVideoProgress(Math.max(videoRenderer.progressValue, 40), { active: true, sync: false });
    setVideoProgressPhase("rendering");
    setVideoStatus("video.status.rendering");
    syncVideoRendererUi();
    const response = await fetch(`${BRIDGE_HTTP_BASE}/api/render-mscore`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        fileBase64,
      }),
    });

    if (!response.ok) {
      let reason = `${response.status} ${response.statusText}`;
      try {
        const errorPayload = await response.json();
        if (errorPayload?.error) {
          reason = errorPayload.error;
        }
      } catch {
        const raw = await response.text();
        if (raw) {
          reason = raw;
        }
      }
      throw new Error(normalizeRenderErrorReason(reason));
    }

    setVideoProgress(Math.max(videoRenderer.progressValue, 96), { active: true, sync: false });
    const blob = await response.blob();
    setVideoProgress(Math.max(videoRenderer.progressValue, 98), { active: true, sync: false });
    const fileName = getFilenameFromDisposition(response.headers.get("content-disposition"), "fretlab-animation.mp4");
    downloadBlob(blob, fileName);
    setVideoStatus("video.status.success", {}, "success");
    renderSucceeded = true;
  } catch (error) {
    setVideoStatus(
      "video.status.failed",
      { reason: normalizeRenderErrorReason(error?.message || "") },
      "error"
    );
  } finally {
    videoRenderer.busy = false;
    finishVideoProgress(renderSucceeded);
    syncVideoRendererUi();
  }
}

function setUiLanguage(language, { persist = true } = {}) {
  const next = normalizeUiLanguage(language) ?? "zh";
  if (state.language === next) {
    applyTranslations();
    return;
  }
  state.language = next;
  if (persist) {
    try {
      localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  }
  applyTranslations();
  updateMarkerHint();
  buildShapeLibrary();
  renderOverlayList();
  renderRecorderPanel();
}

function normalizeMarkersForInstrument() {
  const tuning = getActiveTuning();
  const stringCount = tuning.length;
  state.boardStates.forEach((board) => {
    const nextMarkers = {};
    Object.values(board.markers ?? {}).forEach((marker) => {
      const stringIndex = Number(marker?.stringIndex);
      const fret = Number(marker?.fret);
      if (!Number.isInteger(stringIndex) || !Number.isInteger(fret)) {
        return;
      }
      if (stringIndex < 0 || stringIndex >= stringCount || fret < 0) {
        return;
      }
      const id = `${stringIndex}-${fret}`;
      nextMarkers[id] = {
        ...marker,
        id,
        stringIndex,
        fret,
        noteIndex: getPositionNoteIndex(stringIndex, fret, tuning),
        customLabel: null,
      };
    });
    board.markers = nextMarkers;
    if (!nextMarkers[board.selectedId]) {
      board.selectedId = null;
    }
    board.selectedIds = getExistingMarkerIds({ markers: nextMarkers }, board.selectedIds);
  });
  if (recorder.rootMarkerId && !getBoardState().markers[recorder.rootMarkerId]) {
    recorder.rootMarkerId = null;
  }
}

function getCurrentInstrumentLabel() {
  const instrumentId = normalizeInstrumentId(state.instrumentId);
  if (instrumentId === CUSTOM_INSTRUMENT_ID) {
    return t("instrument.custom");
  }
  return t(`instrument.${instrumentId}`);
}

function syncInstrumentControls() {
  const instrumentId = normalizeInstrumentId(state.instrumentId);
  const isGuitar = instrumentId === "guitar";
  const isCustom = instrumentId === CUSTOM_INSTRUMENT_ID;
  if (dom.guitarToneWrap) {
    dom.guitarToneWrap.hidden = !isGuitar;
  }
  if (dom.guitarToneSelect) {
    dom.guitarToneSelect.value = normalizeGuitarTone(state.guitarTone);
    dom.guitarToneSelect.disabled = !isGuitar;
  }
  if (dom.customInstrumentEditBtn) {
    dom.customInstrumentEditBtn.hidden = !isCustom;
  }
}

function updateCustomInstrumentStatus(message = "") {
  customInstrumentModal.statusMessage = message;
  if (dom.customInstrumentStatus) {
    dom.customInstrumentStatus.textContent = message;
  }
}

function getUniformIntervalPresetValue(intervals) {
  if (!Array.isArray(intervals) || !intervals.length) {
    return "custom";
  }
  const first = Number(intervals[0]);
  const isUniform = intervals.every((value) => Number(value) === first);
  if (!isUniform || ![3, 4, 5, 7].includes(first)) {
    return "custom";
  }
  return `${first}`;
}

function getSelectedIntervalPresetSemitones() {
  const value = dom.customIntervalPresetSelect?.value ?? getUniformIntervalPresetValue(customInstrumentModal.draftIntervals);
  const semitones = Number(value);
  return Number.isFinite(semitones) ? semitones : null;
}

function renderCustomIntervalFields() {
  if (!dom.customIntervalFields) {
    return;
  }
  const intervals = Array.isArray(customInstrumentModal.draftIntervals) ? customInstrumentModal.draftIntervals : [];
  const tuning = Array.isArray(customInstrumentModal.draftTuning) ? customInstrumentModal.draftTuning : [];
  const count = sanitizeCustomStringCount(tuning.length || STANDARD_GUITAR_TUNING.length);
  dom.customIntervalFields.innerHTML = intervals
    .map((interval, index) => {
      const fromString = count - index;
      const toString = count - index - 1;
      const options = INTERVAL_OPTIONS.map(
        (entry) =>
          `<option value="${entry.semitones}"${Number(interval) === entry.semitones ? " selected" : ""}>${escapeHtml(
            t(entry.key)
          )}</option>`
      ).join("");
      return `
        <label class="custom-instrument-modal__interval-field">
          <span>${escapeHtml(t("customInstrument.intervalLabel", { from: fromString, to: toString }))}</span>
          <select data-custom-interval-index="${index}">${options}</select>
        </label>
      `;
    })
    .join("");
  if (dom.customIntervalPresetSelect) {
    dom.customIntervalPresetSelect.value = getUniformIntervalPresetValue(intervals);
  }
}

function renderCustomTuningFields() {
  if (!dom.customTuningFields) {
    return;
  }
  const tuning = Array.isArray(customInstrumentModal.draftTuning) ? customInstrumentModal.draftTuning : [];
  const count = sanitizeCustomStringCount(tuning.length || STANDARD_GUITAR_TUNING.length);
  const presetSemitones = getSelectedIntervalPresetSemitones();
  dom.customTuningFields.innerHTML = tuning
    .map(
      (note, index) => `
        <label class="custom-instrument-modal__tuning-field">
          <span>${escapeHtml(t("customInstrument.stringLabel", { string: count - index }))}</span>
          <input
            type="text"
            value="${escapeHtml(note || "")}"
            data-custom-string-index="${index}"
            placeholder="${escapeHtml(t("customInstrument.notePlaceholder"))}"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            ${presetSemitones !== null && index > 0 ? "readonly data-auto-derived=\"true\"" : ""}
          />
        </label>
      `
    )
    .join("");
}

function syncCustomInstrumentModalDraft(count, tuning, { keepStatus = false } = {}) {
  customInstrumentModal.draftTuning = resizeCustomTuningDraft(tuning, count);
  customInstrumentModal.draftIntervals = calculateIntervalsFromTuning(customInstrumentModal.draftTuning);
  if (dom.customStringCountInput) {
    dom.customStringCountInput.value = `${sanitizeCustomStringCount(customInstrumentModal.draftTuning.length)}`;
  }
  renderCustomIntervalFields();
  renderCustomTuningFields();
  if (!keepStatus) {
  }
}

function setCustomInstrumentModalOpen(nextOpen) {
  const isOpen = Boolean(nextOpen);
  state.customInstrumentModalOpen = isOpen;
  dom.customInstrumentModal?.classList.toggle("is-open", isOpen);
  dom.customInstrumentModalBackdrop?.classList.toggle("is-open", isOpen);
  dom.customInstrumentModal?.setAttribute("aria-hidden", isOpen ? "false" : "true");
  dom.customInstrumentModalBackdrop?.setAttribute("aria-hidden", isOpen ? "false" : "true");
  if (!isOpen && dom.instrumentSelect) {
    dom.instrumentSelect.value = normalizeInstrumentId(state.instrumentId);
  }
}

function openCustomInstrumentModal(baseConfig = null) {
  const sourceConfig =
    baseConfig ??
    (normalizeInstrumentId(state.instrumentId) === CUSTOM_INSTRUMENT_ID
      ? state.customInstrumentConfig
      : {
          tuning: getActiveInstrument().tuning,
          openMidi: getActiveInstrument().openMidi,
        });
  const normalized = normalizeCustomInstrumentConfig(sourceConfig, state.customInstrumentConfig);
  syncCustomInstrumentModalDraft(normalized.tuning.length, normalized.tuning);
  setCustomInstrumentModalOpen(true);
}

function closeCustomInstrumentModal() {
  setCustomInstrumentModalOpen(false);
}

function applyCustomInstrumentConfig() {
  const draftTuning = Array.isArray(customInstrumentModal.draftTuning) ? customInstrumentModal.draftTuning : [];
  const stringCount = sanitizeCustomStringCount(draftTuning.length);
  if (stringCount < 1) {
    const message = t("customInstrument.error.invalidStringCount");
    updateCustomInstrumentStatus(message);
    showUiToast(message, "error");
    return;
  }

  const normalizedTuning = [];
  for (let index = 0; index < stringCount; index += 1) {
    const noteName = normalizeTuningNoteName(draftTuning[index]);
    if (!noteName) {
      const stringNumber = stringCount - index;
      const message = t("customInstrument.error.invalidNote", { string: stringNumber });
      updateCustomInstrumentStatus(message);
      showUiToast(message, "error");
      const targetInput = dom.customTuningFields?.querySelector(`[data-custom-string-index="${index}"]`);
      if (targetInput instanceof HTMLInputElement) {
        targetInput.focus();
        targetInput.select();
      }
      return;
    }
    normalizedTuning.push(noteName);
  }

  const nextConfig = normalizeCustomInstrumentConfig(
    {
      tuning: normalizedTuning,
      openMidi:
        normalizeInstrumentId(state.instrumentId) === CUSTOM_INSTRUMENT_ID
          ? state.customInstrumentConfig?.openMidi
          : getActiveInstrument().openMidi,
    },
    state.customInstrumentConfig
  );
  state.customInstrumentConfig = nextConfig;
  persistCustomInstrumentConfig(nextConfig);
  instrumentShapeCache.clear();
  setInstrument(CUSTOM_INSTRUMENT_ID, {
    forceRefresh: normalizeInstrumentId(state.instrumentId) === CUSTOM_INSTRUMENT_ID,
  });
  closeCustomInstrumentModal();
}

function setGuitarTone(tone, { persist = true } = {}) {
  const next = normalizeGuitarTone(tone);
  if (dom.guitarToneSelect) {
    dom.guitarToneSelect.value = next;
  }
  if (state.guitarTone === next) {
    syncInstrumentControls();
    if (normalizeInstrumentId(state.instrumentId) === "guitar") {
      warmupRealtimeAudioForActiveVoice();
    }
    return;
  }
  state.guitarTone = next;
  if (persist) {
    try {
      localStorage.setItem(GUITAR_TONE_STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  }
  syncInstrumentControls();
  if (normalizeInstrumentId(state.instrumentId) === "guitar") {
    warmupRealtimeAudioForActiveVoice();
  }
}

function setInstrument(instrumentId, { persist = true, forceRefresh = false } = {}) {
  const next = normalizeInstrumentId(instrumentId);
  if (dom.instrumentSelect) {
    dom.instrumentSelect.value = next;
  }
  if (state.instrumentId === next && !forceRefresh) {
    syncInstrumentControls();
    return;
  }

  state.instrumentId = next;
  if (persist) {
    try {
      localStorage.setItem(INSTRUMENT_STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  }

  normalizeMarkersForInstrument();
  syncInstrumentControls();
  resetMarkerHistory();
  clearOverlays();
  dragShapeId = null;
  dragOverlayPreview = null;
  realtime.lastMidiPositions.clear();
  realtime.lastVoicePositions.clear();
  clearRealtimeMarkers();
  warmupRealtimeAudioForActiveVoice();
  recorder.output = "";
  renderGrid();
  renderMarkers();
  updateMarkerHint();
  buildShapeLibrary();
  renderRecorderPanel();
}

const LONG_PRESS_MS = 420;
let longPressTimer = null;
let longPressTargetId = null;
let longPressSuppressedId = null;
let longPressPointer = { x: 0, y: 0 };
let enharmonicMenuState = null;
let pendingSvgClick = null;
let marqueeSelection = {
  boardIndex: 0,
  pointerId: null,
  svg: null,
  active: false,
  armed: false,
  ready: false,
  originClientX: 0,
  originClientY: 0,
  currentClientX: 0,
  currentClientY: 0,
  originSvgX: 0,
  originSvgY: 0,
  currentSvgX: 0,
  currentSvgY: 0,
  activationTimer: null,
};
let selectedMarkerDrag = {
  active: false,
  boardIndex: 0,
  pointerId: null,
  svg: null,
  anchorMarkerId: null,
  anchorStringIndex: 0,
  anchorFret: 0,
  selectedIds: [],
  initialMarkers: {},
  moved: false,
  historyRecorded: false,
  rootMarkerId: null,
};
let pendingSelectedMarkerDrag = {
  active: false,
  boardIndex: 0,
  pointerId: null,
  svg: null,
  markerId: null,
  originClientX: 0,
  originClientY: 0,
};
let selectionInteractionSuppressedUntil = 0;

const overlays = [];
let dragShapeId = null;
let dragOverlayPreview = null;
const touchShapeDrag = {
  active: false,
  pointerId: null,
  shapeId: null,
  sourceCard: null,
};
const realtime = {
  markers: new Map(),
  lastMidiPositions: new Map(),
  lastVoicePositions: new Map(),
  fxTrails: [],
  eventSource: null,
  midiAccess: null,
  midiInputs: new Map(),
};
const recorder = {
  active: false,
  rootMarkerId: null,
  output: "",
  copyFeedbackUntil: 0,
};
const videoRenderer = {
  file: null,
  fileValidationErrorKey: null,
  busy: false,
  statusKey: "video.status.idle",
  statusVars: {},
  progressValue: 0,
  progressActive: false,
  progressPhase: "idle",
  progressTimer: null,
  progressResetTimer: null,
};
const VIDEO_ALLOWED_EXTENSIONS = new Set(["mscz", "mscx", "gp5"]);
const MARKER_CLIPBOARD_TYPE = "ic-fretlab-markers-v1";
const markerClipboard = {
  payload: null,
};
const markerHistory = {
  undo: [],
  redo: [],
  maxEntries: 120,
};
const GUITAR_CLASSICAL_SAMPLE_FILES = [
  "A2.mp3",
  "A3.mp3",
  "A4.mp3",
  "A5.mp3",
  "As5.mp3",
  "B1.mp3",
  "B2.mp3",
  "B3.mp3",
  "B4.mp3",
  "Cs3.mp3",
  "Cs4.mp3",
  "Cs5.mp3",
  "D2.mp3",
  "D3.mp3",
  "D5.mp3",
  "Ds4.mp3",
  "E2.mp3",
  "E3.mp3",
  "E4.mp3",
  "E5.mp3",
  "Fs2.mp3",
  "Fs3.mp3",
  "Fs4.mp3",
  "Fs5.mp3",
  "G3.mp3",
  "G5.mp3",
  "Gs2.mp3",
  "Gs4.mp3",
  "Gs5.mp3",
];
const GUITAR_FOLK_SAMPLE_FILES = [
  "A2.mp3",
  "A3.mp3",
  "A4.mp3",
  "As2.mp3",
  "As3.mp3",
  "As4.mp3",
  "B2.mp3",
  "B3.mp3",
  "B4.mp3",
  "C3.mp3",
  "C4.mp3",
  "C5.mp3",
  "Cs3.mp3",
  "Cs4.mp3",
  "Cs5.mp3",
  "D2.mp3",
  "D3.mp3",
  "D4.mp3",
  "D5.mp3",
  "Ds2.mp3",
  "Ds3.mp3",
  "Ds4.mp3",
  "E2.mp3",
  "E3.mp3",
  "E4.mp3",
  "F2.mp3",
  "F3.mp3",
  "F4.mp3",
  "Fs2.mp3",
  "Fs3.mp3",
  "Fs4.mp3",
  "G2.mp3",
  "G3.mp3",
  "G4.mp3",
  "Gs2.mp3",
  "Gs3.mp3",
  "Gs4.mp3",
];
const BASS_ELECTRIC_SAMPLE_FILES = [
  "As1.mp3",
  "As2.mp3",
  "As3.mp3",
  "As4.mp3",
  "Cs1.mp3",
  "Cs2.mp3",
  "Cs3.mp3",
  "Cs4.mp3",
  "Cs5.mp3",
  "E1.mp3",
  "E2.mp3",
  "E3.mp3",
  "E4.mp3",
  "G1.mp3",
  "G2.mp3",
  "G3.mp3",
  "G4.mp3",
];
const SAMPLE_LIBRARY = {
  guitar_classical: {
    gain: 0.82,
    releaseMs: 260,
    samples: GUITAR_CLASSICAL_SAMPLE_FILES.map((file) => ({
      url: `assets/samples/guitar-classical/${file}`,
      midi: 0,
      weight: 1,
    })),
  },
  guitar_folk: {
    gain: 0.86,
    releaseMs: 240,
    samples: GUITAR_FOLK_SAMPLE_FILES.map((file) => ({
      url: `assets/samples/guitar-folk/${file}`,
      midi: 0,
      weight: 1,
    })),
  },
  bass_electric: {
    gain: 0.95,
    releaseMs: 220,
    samples: BASS_ELECTRIC_SAMPLE_FILES.map((file) => ({
      url: `assets/samples/bass-electric/${file}`,
      midi: 0,
      weight: 1,
    })),
  },
  ukulele: {
    gain: 0.84,
    releaseMs: 200,
    samples: [
      { url: "assets/samples/ukulele/00_c3_long_soft.wav", midi: 48, weight: 0.8 },
      { url: "assets/samples/ukulele/02_c3_long_hard.wav", midi: 48, weight: 1 },
      { url: "assets/samples/ukulele/05_c4_soft.wav", midi: 60, weight: 0.82 },
      { url: "assets/samples/ukulele/06_c4_hard.wav", midi: 60, weight: 1.02 },
    ],
  },
};
const AUDIO_UNLOCK_EVENTS = ["pointerdown", "keydown", "touchstart"];
const CLICK_PREVIEW_DURATION_MS = 420;
const CLICK_PREVIEW_VELOCITY = 108;
const SVG_CLICK_DELAY_MS = 220;
const SELECTION_CLICK_SUPPRESS_MS = 90;
const MARQUEE_SELECTION_LONG_PRESS_MS = 160;
const MARQUEE_SELECTION_DRAG_THRESHOLD_PX = 6;
const MARKER_DOT_RADIUS = 18;
const OVERLAY_DOT_RADIUS = 18;
const OVERLAY_ROOT_DOT_RADIUS = 19;
const REALTIME_DOT_RADIUS = 21;
const REALTIME_DOT_CORE_RADIUS = 16;
const REALTIME_ONSET_RING_RADIUS = 23;
const realtimeAudio = {
  context: null,
  masterGain: null,
  buffers: new Map(),
  loadPromises: new Map(),
  activeVoices: new Map(),
  stopTimers: new Map(),
  warmedVoices: new Set(),
  recentCellPreviews: new Map(),
  unlockBound: false,
};

const ENHARMONIC_OPTIONS = [
  ["C", "B#", "Dbb"],
  ["Db", "C#", "B##"],
  ["D", "C##", "Ebb"],
  ["Eb", "D#", "Fbb"],
  ["E", "D##", "Fb"],
  ["F", "E#", "Gbb"],
  ["F#", "Gb", "E##"],
  ["G", "F##", "Abb"],
  ["Ab", "G#"],
  ["A", "G##", "Bbb"],
  ["Bb", "A#", "Cbb"],
  ["B", "A##", "Cb"],
];

let transparentDragImage = null;

function getFretboardSvgs() {
  const svgs = Array.from(dom.fretboardStack?.querySelectorAll(".fretboard-svg") ?? []);
  return svgs.length ? svgs : dom.svg ? [dom.svg] : [];
}

function createEmptyBoardState() {
  return { markers: {}, selectedId: null, selectedIds: [] };
}

function normalizeBoardIndex(value) {
  const count = Math.max(1, Math.floor(state.boardCount || 1));
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return state.activeBoardIndex;
  }
  return Math.max(0, Math.min(count - 1, Math.floor(numeric)));
}

function ensureBoardStates() {
  const count = Math.max(1, Math.floor(state.boardCount || 1));
  while (state.boardStates.length < count) {
    state.boardStates.push(createEmptyBoardState());
  }
  if (state.boardStates.length > count) {
    state.boardStates.length = count;
  }
  if (state.activeBoardIndex >= count) {
    state.activeBoardIndex = count - 1;
    recorder.rootMarkerId = null;
    recorder.output = "";
  }
}

function getBoardState(boardIndex = state.activeBoardIndex) {
  const normalized = normalizeBoardIndex(boardIndex);
  if (!state.boardStates[normalized]) {
    state.boardStates[normalized] = createEmptyBoardState();
  }
  return state.boardStates[normalized];
}

function getExistingMarkerIds(board, markerIds) {
  if (!Array.isArray(markerIds) || !markerIds.length) {
    return [];
  }
  return markerIds.filter((id) => Boolean(board?.markers?.[id]));
}

function setSelectedMarkerIds(boardIndex, markerIds = [], { preferredId = null } = {}) {
  const board = getBoardState(boardIndex);
  const nextSelectedIds = getExistingMarkerIds(board, markerIds);
  board.selectedIds = nextSelectedIds;
  if (preferredId && board.markers[preferredId]) {
    board.selectedId = preferredId;
  } else if (nextSelectedIds.length) {
    board.selectedId = nextSelectedIds.includes(board.selectedId) ? board.selectedId : nextSelectedIds[0];
  } else if (!board.markers[board.selectedId]) {
    board.selectedId = null;
  }
  return nextSelectedIds;
}

function clearSelectedMarkerIds(boardIndex) {
  const board = getBoardState(boardIndex);
  board.selectedIds = [];
}

function cloneBoardMarkers(markers, { maxFret = Infinity } = {}) {
  const tuning = getActiveTuning();
  const stringCount = tuning.length;
  const nextMarkers = {};
  Object.values(markers ?? {}).forEach((marker) => {
    const stringIndex = Number(marker?.stringIndex);
    const fret = Number(marker?.fret);
    if (!Number.isInteger(stringIndex) || !Number.isInteger(fret)) {
      return;
    }
    if (stringIndex < 0 || stringIndex >= stringCount || fret < 0 || fret > maxFret) {
      return;
    }
    const id = `${stringIndex}-${fret}`;
    nextMarkers[id] = {
      id,
      stringIndex,
      fret,
      noteIndex: getPositionNoteIndex(stringIndex, fret, tuning),
      interval: `${marker?.interval ?? ""}`,
      customLabel: typeof marker?.customLabel === "string" ? marker.customLabel : null,
      isRecorderRoot: Boolean(marker?.isRecorderRoot),
    };
  });
  return nextMarkers;
}

function createBoardSnapshot(boardIndex = state.activeBoardIndex) {
  const normalizedBoardIndex = normalizeBoardIndex(boardIndex);
  const board = getBoardState(normalizedBoardIndex);
  const markers = cloneBoardMarkers(board.markers);
  const selectedIds = getExistingMarkerIds({ markers }, board.selectedIds);
  return {
    boardIndex: normalizedBoardIndex,
    markers,
    selectedId: markers[board.selectedId] ? board.selectedId : null,
    selectedIds,
    rootMarkerId:
      normalizedBoardIndex === state.activeBoardIndex && markers[recorder.rootMarkerId]
        ? recorder.rootMarkerId
        : null,
  };
}

function resetMarkerHistory() {
  markerHistory.undo.length = 0;
  markerHistory.redo.length = 0;
}

function rememberBoardHistory(boardIndex = state.activeBoardIndex) {
  markerHistory.undo.push(createBoardSnapshot(boardIndex));
  if (markerHistory.undo.length > markerHistory.maxEntries) {
    markerHistory.undo.shift();
  }
  markerHistory.redo.length = 0;
}

function restoreBoardSnapshot(snapshot) {
  if (!snapshot) {
    return false;
  }
  const boardIndex = normalizeBoardIndex(snapshot.boardIndex);
  setActiveBoard(boardIndex, { resetRecorder: false });
  const board = getBoardState(boardIndex);
  const markers = cloneBoardMarkers(snapshot.markers, { maxFret: state.fretCount });
  board.markers = markers;
  board.selectedId = markers[snapshot.selectedId] ? snapshot.selectedId : null;
  board.selectedIds = getExistingMarkerIds({ markers }, snapshot.selectedIds);
  if (state.activeBoardIndex === boardIndex) {
    recorder.rootMarkerId = markers[snapshot.rootMarkerId] ? snapshot.rootMarkerId : null;
    recorder.output = "";
  }
  renderMarkers();
  updateMarkerHint();
  renderRecorderPanel();
  return true;
}

function undoBoardMutation() {
  if (!markerHistory.undo.length) {
    return false;
  }
  const snapshot = markerHistory.undo.pop();
  markerHistory.redo.push(createBoardSnapshot(snapshot.boardIndex));
  if (markerHistory.redo.length > markerHistory.maxEntries) {
    markerHistory.redo.shift();
  }
  return restoreBoardSnapshot(snapshot);
}

function redoBoardMutation() {
  if (!markerHistory.redo.length) {
    return false;
  }
  const snapshot = markerHistory.redo.pop();
  markerHistory.undo.push(createBoardSnapshot(snapshot.boardIndex));
  if (markerHistory.undo.length > markerHistory.maxEntries) {
    markerHistory.undo.shift();
  }
  return restoreBoardSnapshot(snapshot);
}

function buildMarkerClipboardPayload(boardIndex = state.activeBoardIndex) {
  const board = getBoardState(boardIndex);
  const selectedIds = getExistingMarkerIds(board, board.selectedIds);
  const clonedMarkers = cloneBoardMarkers(board.markers);
  const markers = (selectedIds.length ? selectedIds.map((id) => clonedMarkers[id]) : Object.values(clonedMarkers)).filter(Boolean);
  const selectedId = selectedIds.length
    ? (selectedIds.includes(board.selectedId) ? board.selectedId : selectedIds[0] ?? null)
    : board.selectedId;
  return {
    type: MARKER_CLIPBOARD_TYPE,
    instrumentId: getActiveInstrument().id,
    markers,
    selectedId,
    selectedIds,
    selectionOnly: selectedIds.length > 0,
    rootMarkerId:
      boardIndex === state.activeBoardIndex && clonedMarkers[recorder.rootMarkerId] && (!selectedIds.length || selectedIds.includes(recorder.rootMarkerId))
        ? recorder.rootMarkerId
        : null,
  };
}

function parseMarkerClipboardPayload(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return null;
  }
  try {
    const parsed = JSON.parse(rawText);
    if (parsed?.type !== MARKER_CLIPBOARD_TYPE || !Array.isArray(parsed?.markers)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function copyMarkersToLocalClipboard(boardIndex = state.activeBoardIndex) {
  const payload = buildMarkerClipboardPayload(boardIndex);
  markerClipboard.payload = payload;
  if (!payload.markers.length) {
    return false;
  }
  const text = JSON.stringify(payload);
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text).catch(() => {});
  }
  return true;
}

function applyMarkerClipboardPayload(payload, boardIndex = state.activeBoardIndex) {
  if (!payload || !Array.isArray(payload.markers)) {
    return false;
  }
  const normalizedBoardIndex = normalizeBoardIndex(boardIndex);
  const pastedMarkers = cloneBoardMarkers(payload.markers, { maxFret: state.fretCount });
  const pastedIds = Object.keys(pastedMarkers);
  if (!pastedIds.length) {
    return false;
  }
  rememberBoardHistory(normalizedBoardIndex);
  const board = getBoardState(normalizedBoardIndex);
  const nextMarkers = payload.selectionOnly
    ? {
        ...cloneBoardMarkers(board.markers, { maxFret: state.fretCount }),
        ...pastedMarkers,
      }
    : pastedMarkers;
  board.markers = nextMarkers;
  const selectedIds = getExistingMarkerIds({ markers: nextMarkers }, payload.selectionOnly ? pastedIds : payload.selectedIds ?? pastedIds);
  board.selectedIds = selectedIds;
  board.selectedId = nextMarkers[payload.selectedId] ? payload.selectedId : selectedIds[0] ?? Object.keys(nextMarkers)[0] ?? null;
  if (state.activeBoardIndex === normalizedBoardIndex) {
    recorder.rootMarkerId = nextMarkers[payload.rootMarkerId]
      ? payload.rootMarkerId
      : (payload.selectionOnly ? recorder.rootMarkerId : null);
    recorder.output = "";
  }
  renderMarkers();
  updateMarkerHint();
  renderRecorderPanel();
  return true;
}

async function pasteMarkersFromClipboard(boardIndex = state.activeBoardIndex) {
  let payload = markerClipboard.payload;
  if (!payload && navigator.clipboard?.readText) {
    try {
      payload = parseMarkerClipboardPayload(await navigator.clipboard.readText());
    } catch {
      payload = null;
    }
  }
  if (!payload) {
    return false;
  }
  return applyMarkerClipboardPayload(payload, boardIndex);
}

function isEditableShortcutTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }
  if (target instanceof HTMLElement && target.isContentEditable) {
    return true;
  }
  return Boolean(target.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']"));
}

function parseSampleNoteTokenToMidi(token) {
  const match = `${token ?? ""}`.trim().match(/^([A-G])(s|#|b)?(-?\d+)$/i);
  if (!match) {
    return null;
  }
  const [, letterRaw, accidentalRaw = "", octaveRaw] = match;
  const letter = letterRaw.toUpperCase();
  const accidental = accidentalRaw.toLowerCase() === "s" ? "#" : accidentalRaw;
  const noteName = `${letter}${accidental}`;
  const noteIndex = getNoteIndex(noteName);
  const octave = Number(octaveRaw);
  if (!Number.isFinite(noteIndex) || !Number.isFinite(octave)) {
    return null;
  }
  return (octave + 1) * 12 + noteIndex;
}

function inferSampleMidiFromUrl(url) {
  const fileName = `${url ?? ""}`.split("/").pop() ?? "";
  const stem = fileName.replace(/\.[^.]+$/, "");
  const direct = parseSampleNoteTokenToMidi(stem);
  if (Number.isFinite(direct)) {
    return direct;
  }
  const embedded = stem.match(/([A-G](?:s|#|b)?-?\d+)/i)?.[1] ?? null;
  if (!embedded) {
    return null;
  }
  return parseSampleNoteTokenToMidi(embedded);
}

function ensureSampleLibraryMidiMap() {
  Object.values(SAMPLE_LIBRARY).forEach((voiceConfig) => {
    voiceConfig.samples = (voiceConfig.samples ?? [])
      .map((sample) => {
        const inferredMidi = Number.isFinite(sample?.midi) && sample.midi > 0 ? sample.midi : inferSampleMidiFromUrl(sample?.url);
        if (!Number.isFinite(inferredMidi)) {
          return null;
        }
        return {
          url: `${sample.url}`,
          midi: inferredMidi,
          weight: Number.isFinite(sample.weight) ? sample.weight : 1,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.midi - b.midi || `${a.url}`.localeCompare(`${b.url}`));
  });
}

function getRealtimeAudioVoiceId() {
  const instrumentId = normalizeInstrumentId(state.instrumentId);
  if (instrumentId === "guitar") {
    return normalizeGuitarTone(state.guitarTone) === "folk" ? "guitar_folk" : "guitar_classical";
  }
  if (instrumentId === "bass") {
    return "bass_electric";
  }
  if (instrumentId === "ukulele") {
    return "ukulele";
  }
  return "guitar_classical";
}

function ensureRealtimeAudioContext() {
  const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextCtor) {
    return null;
  }
  if (!realtimeAudio.context) {
    const context = new AudioContextCtor();
    const masterGain = context.createGain();
    masterGain.gain.value = 0.9;
    masterGain.connect(context.destination);
    realtimeAudio.context = context;
    realtimeAudio.masterGain = masterGain;
  }
  return realtimeAudio.context;
}

async function unlockRealtimeAudio() {
  const context = ensureRealtimeAudioContext();
  if (!context) {
    return false;
  }
  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      return false;
    }
  }
  return context.state === "running";
}

function bindRealtimeAudioUnlockGestures() {
  if (realtimeAudio.unlockBound) {
    return;
  }
  realtimeAudio.unlockBound = true;
  const unlock = () => {
    void unlockRealtimeAudio().then((unlocked) => {
      if (unlocked) {
        warmupRealtimeAudioForActiveVoice();
      }
    });
  };
  AUDIO_UNLOCK_EVENTS.forEach((eventName) => {
    window.addEventListener(eventName, unlock, { passive: true });
  });
}

function getSampleCacheKey(voiceId, sampleUrl) {
  return `${voiceId}::${sampleUrl}`;
}

async function loadSampleBuffer(voiceId, sampleUrl) {
  const cacheKey = getSampleCacheKey(voiceId, sampleUrl);
  if (realtimeAudio.buffers.has(cacheKey)) {
    return realtimeAudio.buffers.get(cacheKey);
  }
  if (realtimeAudio.loadPromises.has(cacheKey)) {
    return realtimeAudio.loadPromises.get(cacheKey);
  }
  const context = ensureRealtimeAudioContext();
  if (!context) {
    return null;
  }
  const promise = (async () => {
    const response = await fetch(sampleUrl, { cache: "force-cache" });
    if (!response.ok) {
      throw new Error(`failed_to_load_sample:${sampleUrl}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
    realtimeAudio.buffers.set(cacheKey, audioBuffer);
    return audioBuffer;
  })()
    .catch(() => null)
    .finally(() => {
      realtimeAudio.loadPromises.delete(cacheKey);
    });
  realtimeAudio.loadPromises.set(cacheKey, promise);
  return promise;
}

function pickBestSampleForMidi(voiceId, midiNote, velocity = 100) {
  const voice = SAMPLE_LIBRARY[voiceId];
  if (!voice || !Array.isArray(voice.samples) || !voice.samples.length) {
    return null;
  }
  const targetMidi = Number(midiNote);
  if (!Number.isFinite(targetMidi)) {
    return voice.samples[0];
  }
  const velocityScalar = Math.max(0, Math.min(127, Number(velocity || 0))) / 127;
  return voice.samples.reduce((best, sample) => {
    if (!best) {
      return sample;
    }
    const bestDistance = Math.abs(targetMidi - best.midi) / Math.max(0.0001, best.weight || 1);
    const nextDistance = Math.abs(targetMidi - sample.midi) / Math.max(0.0001, sample.weight || 1);
    if (Math.abs(nextDistance - bestDistance) < 0.0001) {
      const bestHardness = best.weight ?? 1;
      const nextHardness = sample.weight ?? 1;
      const targetHardness = 0.75 + velocityScalar * 0.45;
      return Math.abs(nextHardness - targetHardness) < Math.abs(bestHardness - targetHardness) ? sample : best;
    }
    return nextDistance < bestDistance ? sample : best;
  }, null);
}

function stopRealtimeAudioVoice(eventKey, { immediate = false } = {}) {
  const activeTimer = realtimeAudio.stopTimers.get(eventKey);
  if (activeTimer) {
    clearTimeout(activeTimer);
    realtimeAudio.stopTimers.delete(eventKey);
  }
  const activeVoice = realtimeAudio.activeVoices.get(eventKey);
  if (!activeVoice) {
    return;
  }
  realtimeAudio.activeVoices.delete(eventKey);
  const context = realtimeAudio.context;
  if (!context) {
    return;
  }
  const now = context.currentTime;
  const releaseSeconds = immediate ? 0.01 : Math.max(0.02, (activeVoice.releaseMs ?? 180) / 1000);
  try {
    activeVoice.gainNode.gain.cancelScheduledValues(now);
    activeVoice.gainNode.gain.setValueAtTime(Math.max(0.0001, activeVoice.gainNode.gain.value), now);
    activeVoice.gainNode.gain.linearRampToValueAtTime(0.0001, now + releaseSeconds);
  } catch {
    // ignore automation issues
  }
  try {
    activeVoice.source.stop(now + releaseSeconds + 0.03);
  } catch {
    // source may already be stopped
  }
}

function stopAllRealtimeAudioVoices() {
  Array.from(realtimeAudio.activeVoices.keys()).forEach((eventKey) => {
    stopRealtimeAudioVoice(eventKey, { immediate: true });
  });
}

function scheduleRealtimeAudioStop(eventKey, durationMs = CLICK_PREVIEW_DURATION_MS) {
  const safeDurationMs = Math.max(40, Math.round(Number(durationMs) || 0));
  const activeTimer = realtimeAudio.stopTimers.get(eventKey);
  if (activeTimer) {
    clearTimeout(activeTimer);
  }
  const timer = window.setTimeout(() => {
    realtimeAudio.stopTimers.delete(eventKey);
    stopRealtimeAudioVoice(eventKey);
  }, safeDurationMs);
  realtimeAudio.stopTimers.set(eventKey, timer);
}

function getMidiNoteFromRealtimePosition(position) {
  const rawMidiNote = Number(position?.midiNote);
  if (Number.isFinite(rawMidiNote)) {
    return Math.round(rawMidiNote);
  }
  const stringIndex = Number(position?.stringIndex);
  const fret = Number(position?.fret);
  if (!Number.isInteger(stringIndex) || !Number.isFinite(fret)) {
    return null;
  }
  const openMidi = getActiveOpenMidi()[stringIndex];
  if (!Number.isFinite(openMidi)) {
    return null;
  }
  return Math.round(openMidi + fret);
}

async function playRealtimeAudioNote(eventKey, position, velocity = 100) {
  const midiNote = getMidiNoteFromRealtimePosition(position);
  if (!Number.isFinite(midiNote)) {
    return;
  }
  const context = ensureRealtimeAudioContext();
  if (!context) {
    return;
  }
  if (!(await unlockRealtimeAudio())) {
    return;
  }
  const voiceId = getRealtimeAudioVoiceId();
  const voiceConfig = SAMPLE_LIBRARY[voiceId];
  if (!voiceConfig) {
    return;
  }
  const sample = pickBestSampleForMidi(voiceId, midiNote, velocity);
  if (!sample) {
    return;
  }
  const buffer = await loadSampleBuffer(voiceId, sample.url);
  if (!buffer) {
    return;
  }
  stopRealtimeAudioVoice(eventKey, { immediate: true });

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = Math.pow(2, (midiNote - sample.midi) / 12);

  const velocityGain = Math.max(0.08, Math.min(1, Number(velocity || 0) / 127));
  const gainNode = context.createGain();
  const now = context.currentTime;
  const peakGain = Math.min(1.15, velocityGain * (voiceConfig.gain ?? 0.85));
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.linearRampToValueAtTime(peakGain, now + 0.008);
  source.connect(gainNode);
  gainNode.connect(realtimeAudio.masterGain);
  source.start(now);
  source.onended = () => {
    const active = realtimeAudio.activeVoices.get(eventKey);
    if (active?.source === source) {
      realtimeAudio.activeVoices.delete(eventKey);
    }
  };

  realtimeAudio.activeVoices.set(eventKey, {
    source,
    gainNode,
    releaseMs: Number(voiceConfig.releaseMs || 180),
  });
}

function getBoardClickPreviewEventKey(boardIndex, stringIndex, fret) {
  return `click:${normalizeBoardIndex(boardIndex)}:${Number(stringIndex)}:${Number(fret)}`;
}

function getBoardCellPreviewKey(boardIndex, stringIndex, fret) {
  return `${normalizeBoardIndex(boardIndex)}:${Number(stringIndex)}:${Number(fret)}`;
}

function rememberRecentBoardCellPreview(boardIndex, stringIndex, fret) {
  realtimeAudio.recentCellPreviews.set(
    getBoardCellPreviewKey(boardIndex, stringIndex, fret),
    Date.now() + SVG_CLICK_DELAY_MS + 120
  );
}

function consumeRecentBoardCellPreview(boardIndex, stringIndex, fret) {
  const key = getBoardCellPreviewKey(boardIndex, stringIndex, fret);
  const until = realtimeAudio.recentCellPreviews.get(key);
  if (!until) {
    return false;
  }
  if (until < Date.now()) {
    realtimeAudio.recentCellPreviews.delete(key);
    return false;
  }
  realtimeAudio.recentCellPreviews.delete(key);
  return true;
}

function previewBoardCellAudio(boardIndex, stringIndex, fret, velocity = CLICK_PREVIEW_VELOCITY) {
  if (!Number.isInteger(Number(stringIndex)) || !Number.isFinite(Number(fret))) {
    return;
  }
  const normalizedStringIndex = Number(stringIndex);
  const normalizedFret = Number(fret);
  if (!isValidRealtimePosition(normalizedStringIndex, normalizedFret)) {
    return;
  }
  rememberRecentBoardCellPreview(boardIndex, normalizedStringIndex, normalizedFret);
  const eventKey = getBoardClickPreviewEventKey(boardIndex, normalizedStringIndex, normalizedFret);
  void playRealtimeAudioNote(
    eventKey,
    {
      stringIndex: normalizedStringIndex,
      fret: normalizedFret,
    },
    velocity
  ).then(() => {
    scheduleRealtimeAudioStop(eventKey);
  });
}

function warmupRealtimeAudioForActiveVoice() {
  const voiceId = getRealtimeAudioVoiceId();
  const voice = SAMPLE_LIBRARY[voiceId];
  if (!voice?.samples?.length) {
    return;
  }
  if (realtimeAudio.warmedVoices.has(voiceId)) {
    return;
  }
  realtimeAudio.warmedVoices.add(voiceId);
  voice.samples.forEach((sample) => {
    void loadSampleBuffer(voiceId, sample.url);
  });
}

function getBoardIndexFromSvg(svg) {
  if (!(svg instanceof SVGSVGElement)) {
    return state.activeBoardIndex;
  }
  const value = Number(svg.dataset.boardIndex);
  return normalizeBoardIndex(Number.isNaN(value) ? state.activeBoardIndex : value);
}

function getSvgForBoardIndex(boardIndex = state.activeBoardIndex) {
  const svgs = getFretboardSvgs();
  return svgs[normalizeBoardIndex(boardIndex)] ?? svgs[0] ?? null;
}

function getBoardIndexFromEvent(event) {
  const targetSvg =
    event.currentTarget instanceof SVGSVGElement
      ? event.currentTarget
      : event.target instanceof Element
        ? event.target.closest(".fretboard-svg")
        : null;
  return getBoardIndexFromSvg(targetSvg);
}

function syncActiveBoardUi() {
  const svgs = getFretboardSvgs();
  svgs.forEach((svg, index) => {
    svg.classList.toggle("is-active-board", index === state.activeBoardIndex);
  });
}

function setActiveBoard(boardIndex, { resetRecorder = true } = {}) {
  const normalized = normalizeBoardIndex(boardIndex);
  if (state.activeBoardIndex === normalized) {
    return;
  }
  state.activeBoardIndex = normalized;
  if (resetRecorder) {
    recorder.rootMarkerId = null;
    recorder.output = "";
  }
  syncActiveBoardUi();
  updateMarkerHint();
  renderRecorderPanel();
}

function bindFretboardSvgInteractions(svg) {
  if (!svg || svg.dataset.interactionsBound === "true") {
    return;
  }
  svg.addEventListener("click", handleSvgClick);
  svg.addEventListener("dblclick", handleSvgDoubleClick);
  svg.addEventListener("pointerdown", handleMarkerPointerDown);
  svg.addEventListener("pointermove", handleSvgPointerMove);
  svg.addEventListener("pointerup", handlePointerUp);
  svg.addEventListener("pointerleave", handlePointerUp);
  svg.addEventListener("pointercancel", handlePointerUp);
  svg.addEventListener("dragover", handleBoardDragOver);
  svg.addEventListener("drop", handleBoardDrop);
  svg.dataset.interactionsBound = "true";
}

function syncFretboardCount() {
  if (!dom.fretboardStack) {
    return;
  }
  const nextCount = Math.max(1, Math.floor(state.boardCount || 1));
  state.boardCount = nextCount;
  if (dom.boardCountInput) {
    dom.boardCountInput.value = `${nextCount}`;
  }
  ensureBoardStates();
  const current = getFretboardSvgs();
  if (!current.length && dom.svg) {
    dom.svg.classList.add("fretboard-svg");
    dom.fretboardStack.appendChild(dom.svg);
  }
  const svgs = getFretboardSvgs();
  while (svgs.length < nextCount) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("fretboard-svg");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    dom.fretboardStack.appendChild(svg);
    svgs.push(svg);
  }
  while (svgs.length > nextCount) {
    svgs.pop()?.remove();
  }
  const isSingleBoard = getFretboardSvgs().length === 1;
  dom.fretboardStack.classList.toggle("is-single", isSingleBoard);
  dom.fretboardStack.closest(".board-panel__fretboard")?.classList.toggle("is-single-board", isSingleBoard);
  getFretboardSvgs().forEach((svg, index) => {
    svg.dataset.boardIndex = `${index}`;
    bindFretboardSvgInteractions(svg);
  });
  syncActiveBoardUi();
}

function setBoardCount(nextCount) {
  const sanitized = Math.max(1, Math.floor(Number(nextCount) || 1));
  if (dom.boardCountInput) {
    dom.boardCountInput.value = `${sanitized}`;
  }
  if (state.boardCount === sanitized) {
    return;
  }
  state.boardCount = sanitized;
  resetMarkerHistory();
  syncFretboardCount();
  renderGrid();
  renderMarkers();
  updateMarkerHint();
  renderRecorderPanel();
}

function sanitizeFretCount(nextCount) {
  return Math.min(MAX_FRET_COUNT, Math.max(1, Math.round(Number(nextCount) || 1)));
}

function sanitizeFretStart(nextStart, maxFret = state.fretCount) {
  return Math.max(1, Math.min(Math.round(Number(nextStart) || 1), Math.max(1, Math.round(Number(maxFret) || 1))));
}

function syncFretRangeInputs() {
  if (dom.fretStartInput) {
    dom.fretStartInput.max = `${state.fretCount}`;
    dom.fretStartInput.value = `${getVisibleFretStart()}`;
  }
  if (dom.fretEndInput) {
    dom.fretEndInput.min = `${getVisibleFretStart()}`;
    dom.fretEndInput.value = `${state.fretCount}`;
  }
}

function applyFretRange(nextStart, nextEnd, { markCustom = false } = {}) {
  const sanitizedEnd = sanitizeFretCount(nextEnd);
  const sanitizedStart = sanitizeFretStart(nextStart, sanitizedEnd);
  if (state.fretStart === sanitizedStart && state.fretCount === sanitizedEnd) {
    if (markCustom) {
      state.hasCustomFretRange = true;
    }
    syncFretRangeInputs();
    return false;
  }
  state.fretStart = sanitizedStart;
  state.fretCount = sanitizedEnd;
  if (markCustom) {
    state.hasCustomFretRange = true;
  }
  syncFretRangeInputs();
  renderGrid();
  renderMarkers();
  renderOverlays();
  renderRealtimeMarkers();
  return true;
}

function setFretCount(nextCount, options = {}) {
  return applyFretRange(state.fretStart, nextCount, options);
}

function setFretStart(nextStart, options = {}) {
  return applyFretRange(nextStart, state.fretCount, options);
}

function setFretRange(nextStart, nextEnd, options = {}) {
  return applyFretRange(nextStart, nextEnd, options);
}

function getEnharmonicOptions(noteIndex) {
  return ENHARMONIC_OPTIONS[noteIndex] || [getNoteName(noteIndex, "sharps")];
}

function getTransparentDragImage() {
  if (transparentDragImage) {
    return transparentDragImage;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  transparentDragImage = canvas;
  return transparentDragImage;
}

function pruneBoardSelection(boardIndex) {
  const board = getBoardState(boardIndex);
  board.selectedIds = getExistingMarkerIds(board, board.selectedIds);
  if (!board.selectedIds.includes(board.selectedId) && !board.markers[board.selectedId]) {
    board.selectedId = null;
  }
}

function deleteSelectedMarkers(boardIndex = state.activeBoardIndex) {
  const normalizedBoardIndex = normalizeBoardIndex(boardIndex);
  const board = getBoardState(normalizedBoardIndex);
  const selectedIds = getExistingMarkerIds(board, board.selectedIds);
  if (!selectedIds.length) {
    return false;
  }
  rememberBoardHistory(normalizedBoardIndex);
  selectedIds.forEach((markerId) => {
    delete board.markers[markerId];
    if (recorder.rootMarkerId === markerId) {
      recorder.rootMarkerId = null;
      recorder.output = "";
    }
  });
  board.selectedIds = [];
  if (!board.markers[board.selectedId]) {
    board.selectedId = null;
  }
  renderMarkers();
  updateMarkerHint();
  renderRecorderPanel();
  return true;
}

function getClientSelectionRect() {
  return {
    left: Math.min(marqueeSelection.originClientX, marqueeSelection.currentClientX),
    right: Math.max(marqueeSelection.originClientX, marqueeSelection.currentClientX),
    top: Math.min(marqueeSelection.originClientY, marqueeSelection.currentClientY),
    bottom: Math.max(marqueeSelection.originClientY, marqueeSelection.currentClientY),
  };
}

function getSvgSelectionRect() {
  return {
    x: Math.min(marqueeSelection.originSvgX, marqueeSelection.currentSvgX),
    y: Math.min(marqueeSelection.originSvgY, marqueeSelection.currentSvgY),
    width: Math.abs(marqueeSelection.currentSvgX - marqueeSelection.originSvgX),
    height: Math.abs(marqueeSelection.currentSvgY - marqueeSelection.originSvgY),
  };
}

function clientPointToSvg(svg, clientX, clientY) {
  const matrix = svg?.getScreenCTM?.();
  if (!matrix || typeof DOMPoint !== "function") {
    return { x: 0, y: 0 };
  }
  const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
  return { x: point.x, y: point.y };
}

function getMarkerIdFromClientPoint(svg, clientX, clientY, markerIds = null) {
  if (!(svg instanceof SVGSVGElement)) {
    return null;
  }
  const allowed = Array.isArray(markerIds) && markerIds.length ? new Set(markerIds) : null;
  const groups = Array.from(svg.querySelectorAll(".marker-group"));
  for (const group of groups) {
    const markerId = group.dataset.id;
    if (!markerId || (allowed && !allowed.has(markerId))) {
      continue;
    }
    const rect = group.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
      return markerId;
    }
  }
  return null;
}

function renderSelectionMarquee() {
  const svgs = getFretboardSvgs();
  svgs.forEach((svg) => svg.querySelectorAll(".selection-marquee").forEach((node) => node.remove()));
  if (!marqueeSelection.active || !(marqueeSelection.svg instanceof SVGSVGElement)) {
    return;
  }
  const rect = getSvgSelectionRect();
  const marquee = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  marquee.classList.add("selection-marquee");
  marquee.setAttribute("x", `${rect.x}`);
  marquee.setAttribute("y", `${rect.y}`);
  marquee.setAttribute("width", `${Math.max(rect.width, 1)}`);
  marquee.setAttribute("height", `${Math.max(rect.height, 1)}`);
  marqueeSelection.svg.appendChild(marquee);
}

function updateSelectedMarkersFromMarquee(boardIndex) {
  const svg = marqueeSelection.svg;
  if (!(svg instanceof SVGSVGElement)) {
    return;
  }
  const clientRect = getClientSelectionRect();
  const selectedIds = Array.from(svg.querySelectorAll(".marker-group"))
    .filter((group) => {
      const rect = group.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      return (
        centerX >= clientRect.left &&
        centerX <= clientRect.right &&
        centerY >= clientRect.top &&
        centerY <= clientRect.bottom
      );
    })
    .map((group) => group.dataset.id)
    .filter(Boolean);
  const preferredId = selectedIds[selectedIds.length - 1] ?? null;
  setSelectedMarkerIds(boardIndex, selectedIds, { preferredId });
  renderMarkers();
  renderRecorderPanel();
}

function clearBoardSelection(boardIndex = state.activeBoardIndex, { render = true } = {}) {
  clearSelectedMarkerIds(boardIndex);
  if (render) {
    renderMarkers();
    renderRecorderPanel();
  }
}

function clearMarqueeActivationTimer() {
  if (marqueeSelection.activationTimer) {
    clearTimeout(marqueeSelection.activationTimer);
    marqueeSelection.activationTimer = null;
  }
}

function clearPendingSelectedMarkerDrag() {
  pendingSelectedMarkerDrag = {
    active: false,
    boardIndex: 0,
    pointerId: null,
    svg: null,
    markerId: null,
    originClientX: 0,
    originClientY: 0,
  };
}

function cancelMarqueeSelection({ clearVisual = true } = {}) {
  clearMarqueeActivationTimer();
  marqueeSelection.pointerId = null;
  marqueeSelection.armed = false;
  marqueeSelection.ready = false;
  marqueeSelection.active = false;
  marqueeSelection.svg = null;
  if (clearVisual) {
    renderSelectionMarquee();
  }
}

function getBoardCellFromSvgPoint(x, y) {
  const stringCount = getStringCount();
  const spacing = getStringSpacing();
  const visualIndex = Math.round((y - DIMENSIONS.boardPadding) / spacing);
  if (visualIndex < 0 || visualIndex >= stringCount) {
    return null;
  }
  const stringIndex = stringCount - 1 - visualIndex;
  if (isOpenFretVisible() && x >= getOpenAreaX() && x <= getLeadingAreaWidth()) {
    return { stringIndex, fret: 0 };
  }
  const fretboardStartX = getFretboardAreaX();
  const fretboardEndX = fretboardStartX + DIMENSIONS.fretSpacing * getVisibleFretCount();
  if (x < fretboardStartX || x > fretboardEndX) {
    return null;
  }
  const fretOffset = Math.floor((x - fretboardStartX) / DIMENSIONS.fretSpacing);
  const fret = getVisibleFretStart() + fretOffset;
  if (!isBoardFretVisible(fret)) {
    return null;
  }
  return { stringIndex, fret };
}

function getBoardCellFromEvent(event, boardIndex = state.activeBoardIndex) {
  if (event.target instanceof Element) {
    const directCell = event.target.closest(".cell");
    if (directCell instanceof Element) {
      const stringIndex = Number(directCell.dataset.string);
      const fret = Number(directCell.dataset.fret);
      if (!Number.isNaN(stringIndex) && !Number.isNaN(fret)) {
        return { stringIndex, fret, id: `${stringIndex}-${fret}` };
      }
    }
  }
  if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
    const hitCell = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(".cell");
    if (hitCell instanceof Element) {
      const stringIndex = Number(hitCell.dataset.string);
      const fret = Number(hitCell.dataset.fret);
      if (!Number.isNaN(stringIndex) && !Number.isNaN(fret)) {
        return { stringIndex, fret, id: `${stringIndex}-${fret}` };
      }
    }
  }
  const svg = getSvgForBoardIndex(boardIndex);
  if (svg instanceof SVGSVGElement && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
    const point = clientPointToSvg(svg, event.clientX, event.clientY);
    const cell = getBoardCellFromSvgPoint(point.x, point.y);
    if (cell) {
      return { ...cell, id: `${cell.stringIndex}-${cell.fret}` };
    }
  }
  return null;
}

function updateBoardSelection(boardIndex, markerIds, { preferredId = null, render = true } = {}) {
  setSelectedMarkerIds(boardIndex, markerIds, { preferredId });
  if (render) {
    renderMarkers();
    renderRecorderPanel();
  }
}

function buildDraggedMarkerState(boardIndex, deltaString, deltaFret) {
  const board = getBoardState(boardIndex);
  const selectedIds = getExistingMarkerIds({ markers: selectedMarkerDrag.initialMarkers }, selectedMarkerDrag.selectedIds);
  if (!selectedIds.length) {
    return null;
  }
  const tuning = getActiveTuning();
  const nonSelectedIds = new Set(Object.keys(selectedMarkerDrag.initialMarkers).filter((id) => !selectedIds.includes(id)));
  const nextMarkers = cloneBoardMarkers(selectedMarkerDrag.initialMarkers, { maxFret: state.fretCount });
  selectedIds.forEach((id) => delete nextMarkers[id]);
  const nextSelectedIds = [];
  for (const id of selectedIds) {
    const marker = selectedMarkerDrag.initialMarkers[id];
    if (!marker) {
      return null;
    }
    const stringIndex = marker.stringIndex + deltaString;
    const fret = marker.fret + deltaFret;
    if (
      stringIndex < 0 ||
      stringIndex >= getStringCount() ||
      !Number.isInteger(fret) ||
      fret < getVisibleMinimumFret() ||
      fret > state.fretCount ||
      !isBoardFretVisible(fret)
    ) {
      return null;
    }
    const nextId = `${stringIndex}-${fret}`;
    if (nonSelectedIds.has(nextId) || nextSelectedIds.includes(nextId)) {
      return null;
    }
    nextMarkers[nextId] = {
      ...marker,
      id: nextId,
      stringIndex,
      fret,
      noteIndex: getPositionNoteIndex(stringIndex, fret, tuning),
    };
    nextSelectedIds.push(nextId);
  }
  return {
    markers: nextMarkers,
    selectedIds: nextSelectedIds,
    selectedId:
      selectedIds.includes(board.selectedId)
        ? nextSelectedIds[selectedIds.indexOf(board.selectedId)] ?? nextSelectedIds[0] ?? null
        : nextSelectedIds[0] ?? null,
    rootMarkerId:
      selectedIds.includes(selectedMarkerDrag.rootMarkerId)
        ? nextSelectedIds[selectedIds.indexOf(selectedMarkerDrag.rootMarkerId)] ?? null
        : selectedMarkerDrag.rootMarkerId,
  };
}

function startSelectedMarkerDrag(event, boardIndex, markerId) {
  const svg = event.currentTarget instanceof SVGSVGElement ? event.currentTarget : event.target.closest?.("svg");
  if (!(svg instanceof SVGSVGElement)) {
    return false;
  }
  const board = getBoardState(boardIndex);
  const selectedIds = getExistingMarkerIds(board, board.selectedIds);
  if (!selectedIds.includes(markerId)) {
    return false;
  }
  const anchorMarker = board.markers[markerId];
  if (!anchorMarker) {
    return false;
  }
  cancelLongPress();
  clearPendingSvgClick();
  cancelMarqueeSelection({ clearVisual: true });
  selectedMarkerDrag = {
    active: true,
    boardIndex,
    pointerId: event.pointerId,
    svg,
    anchorMarkerId: markerId,
    anchorStringIndex: anchorMarker.stringIndex,
    anchorFret: anchorMarker.fret,
    selectedIds,
    initialMarkers: cloneBoardMarkers(board.markers, { maxFret: state.fretCount }),
    moved: false,
    historyRecorded: false,
    rootMarkerId: recorder.rootMarkerId,
  };
  svg.setPointerCapture?.(event.pointerId);
  return true;
}

function queueSelectedMarkerDrag(event, boardIndex, markerId) {
  const svg = event.currentTarget instanceof SVGSVGElement ? event.currentTarget : event.target.closest?.("svg");
  if (!(svg instanceof SVGSVGElement)) {
    return false;
  }
  pendingSelectedMarkerDrag = {
    active: true,
    boardIndex,
    pointerId: event.pointerId,
    svg,
    markerId,
    originClientX: event.clientX,
    originClientY: event.clientY,
  };
  return true;
}

function activateQueuedSelectedMarkerDrag() {
  if (!pendingSelectedMarkerDrag.active) {
    return false;
  }
  const { svg, boardIndex, markerId, pointerId } = pendingSelectedMarkerDrag;
  if (!(svg instanceof SVGSVGElement)) {
    clearPendingSelectedMarkerDrag();
    return false;
  }
  const board = getBoardState(boardIndex);
  const selectedIds = getExistingMarkerIds(board, board.selectedIds);
  const anchorMarker = board.markers[markerId];
  if (!selectedIds.includes(markerId) || !anchorMarker) {
    clearPendingSelectedMarkerDrag();
    return false;
  }
  cancelLongPress();
  clearPendingSvgClick();
  cancelMarqueeSelection({ clearVisual: true });
  selectedMarkerDrag = {
    active: true,
    boardIndex,
    pointerId,
    svg,
    anchorMarkerId: markerId,
    anchorStringIndex: anchorMarker.stringIndex,
    anchorFret: anchorMarker.fret,
    selectedIds,
    initialMarkers: cloneBoardMarkers(board.markers, { maxFret: state.fretCount }),
    moved: false,
    historyRecorded: false,
    rootMarkerId: recorder.rootMarkerId,
  };
  clearPendingSelectedMarkerDrag();
  return true;
}

function handleSelectedMarkerDragMove(event) {
  if (
    !selectedMarkerDrag.active &&
    pendingSelectedMarkerDrag.active &&
    pendingSelectedMarkerDrag.pointerId === event.pointerId
  ) {
    const movedDistance = Math.hypot(
      event.clientX - pendingSelectedMarkerDrag.originClientX,
      event.clientY - pendingSelectedMarkerDrag.originClientY
    );
    if (movedDistance >= MARQUEE_SELECTION_DRAG_THRESHOLD_PX) {
      cancelLongPress();
      activateQueuedSelectedMarkerDrag();
    }
  }
  if (!selectedMarkerDrag.active || selectedMarkerDrag.pointerId !== event.pointerId) {
    return false;
  }
  const svg = selectedMarkerDrag.svg;
  if (!(svg instanceof SVGSVGElement)) {
    return false;
  }
  const hitTarget =
    (event.target instanceof Element ? event.target.closest(".cell") : null) ??
    document.elementFromPoint(event.clientX, event.clientY)?.closest?.(".cell") ??
    null;
  let targetCell = null;
  if (hitTarget instanceof Element) {
    const stringIndex = Number(hitTarget.dataset.string);
    const fret = Number(hitTarget.dataset.fret);
    if (!Number.isNaN(stringIndex) && !Number.isNaN(fret)) {
      targetCell = { stringIndex, fret };
    }
  }
  if (!targetCell) {
    const point = clientPointToSvg(svg, event.clientX, event.clientY);
    targetCell = getBoardCellFromSvgPoint(point.x, point.y);
  }
  if (!targetCell) {
    return true;
  }
  const deltaString = targetCell.stringIndex - selectedMarkerDrag.anchorStringIndex;
  const deltaFret = targetCell.fret - selectedMarkerDrag.anchorFret;
  const nextState = buildDraggedMarkerState(selectedMarkerDrag.boardIndex, deltaString, deltaFret);
  if (!nextState) {
    return true;
  }
  const board = getBoardState(selectedMarkerDrag.boardIndex);
  const currentSignature = selectedMarkerDrag.selectedIds.map((id) => board.markers[id]?.id ?? id).join("|");
  const nextSignature = nextState.selectedIds.join("|");
  if (currentSignature === nextSignature) {
    return true;
  }
  if (!selectedMarkerDrag.historyRecorded) {
    rememberBoardHistory(selectedMarkerDrag.boardIndex);
    selectedMarkerDrag.historyRecorded = true;
  }
  board.markers = nextState.markers;
  board.selectedIds = nextState.selectedIds;
  board.selectedId = nextState.selectedId;
  if (state.activeBoardIndex === selectedMarkerDrag.boardIndex) {
    recorder.rootMarkerId = board.markers[nextState.rootMarkerId] ? nextState.rootMarkerId : null;
    recorder.output = "";
  }
  selectedMarkerDrag.moved = true;
  renderMarkers();
  renderRecorderPanel();
  return true;
}

function finishSelectedMarkerDrag(event) {
  if (!selectedMarkerDrag.active || selectedMarkerDrag.pointerId !== event.pointerId) {
    return false;
  }
  const svg = selectedMarkerDrag.svg;
  selectionInteractionSuppressedUntil = Date.now() + SELECTION_CLICK_SUPPRESS_MS;
  selectedMarkerDrag = {
    active: false,
    boardIndex: 0,
    pointerId: null,
    svg: null,
    anchorMarkerId: null,
    anchorStringIndex: 0,
    anchorFret: 0,
    selectedIds: [],
    initialMarkers: {},
    moved: false,
    historyRecorded: false,
    rootMarkerId: null,
  };
  clearPendingSelectedMarkerDrag();
  svg?.releasePointerCapture?.(event.pointerId);
  return true;
}

function startMarqueeSelection(event, boardIndex, svgOverride = null) {
  const svg =
    svgOverride ??
    (event.currentTarget instanceof SVGSVGElement
      ? event.currentTarget
      : event.target instanceof Element
        ? event.target.closest(".fretboard-svg")
        : null) ??
    getSvgForBoardIndex(boardIndex);
  if (!(svg instanceof SVGSVGElement)) {
    return;
  }
  cancelLongPress();
  clearPendingSvgClick();
  marqueeSelection.boardIndex = boardIndex;
  marqueeSelection.pointerId = event.pointerId;
  marqueeSelection.svg = svg;
  marqueeSelection.armed = true;
  marqueeSelection.ready = false;
  marqueeSelection.active = false;
  marqueeSelection.originClientX = event.clientX;
  marqueeSelection.originClientY = event.clientY;
  marqueeSelection.currentClientX = event.clientX;
  marqueeSelection.currentClientY = event.clientY;
  const origin = clientPointToSvg(svg, event.clientX, event.clientY);
  marqueeSelection.originSvgX = origin.x;
  marqueeSelection.originSvgY = origin.y;
  marqueeSelection.currentSvgX = origin.x;
  marqueeSelection.currentSvgY = origin.y;
  clearMarqueeActivationTimer();
  marqueeSelection.activationTimer = window.setTimeout(() => {
    if (!marqueeSelection.armed || marqueeSelection.pointerId !== event.pointerId) {
      return;
    }
    marqueeSelection.ready = true;
    marqueeSelection.activationTimer = null;
  }, MARQUEE_SELECTION_LONG_PRESS_MS);
  svg.setPointerCapture?.(event.pointerId);
}

function handleMarqueePointerMove(event) {
  if (!marqueeSelection.armed || marqueeSelection.pointerId !== event.pointerId) {
    return;
  }
  marqueeSelection.currentClientX = event.clientX;
  marqueeSelection.currentClientY = event.clientY;
  const svg = marqueeSelection.svg;
  if (!(svg instanceof SVGSVGElement)) {
    return;
  }
  const current = clientPointToSvg(svg, event.clientX, event.clientY);
  marqueeSelection.currentSvgX = current.x;
  marqueeSelection.currentSvgY = current.y;
  const movedDistance = Math.hypot(
    marqueeSelection.currentClientX - marqueeSelection.originClientX,
    marqueeSelection.currentClientY - marqueeSelection.originClientY
  );
  if (!marqueeSelection.active && marqueeSelection.ready && movedDistance >= MARQUEE_SELECTION_DRAG_THRESHOLD_PX) {
    marqueeSelection.active = true;
  }
  if (marqueeSelection.active) {
    renderSelectionMarquee();
  }
}

function finishMarqueeSelection(event) {
  if (!marqueeSelection.armed || marqueeSelection.pointerId !== event.pointerId) {
    return false;
  }
  const boardIndex = marqueeSelection.boardIndex;
  const wasActive = marqueeSelection.active;
  if (wasActive) {
    handleMarqueePointerMove(event);
    updateSelectedMarkersFromMarquee(boardIndex);
    selectionInteractionSuppressedUntil = Date.now() + SELECTION_CLICK_SUPPRESS_MS;
  }
  const svg = marqueeSelection.svg;
  cancelMarqueeSelection({ clearVisual: true });
  clearPendingSelectedMarkerDrag();
  svg?.releasePointerCapture?.(event.pointerId);
  return wasActive;
}

function toggleMarker(boardIndex, stringIndex, fret) {
  const board = getBoardState(boardIndex);
  rememberBoardHistory(boardIndex);
  const id = `${stringIndex}-${fret}`;
  const existing = board.markers[id];
  if (existing) {
    if (recorder.rootMarkerId === id) {
      recorder.rootMarkerId = null;
      recorder.output = "";
    }
    delete board.markers[id];
    if (board.selectedId === id) {
      board.selectedId = null;
    }
    board.selectedIds = [];
  } else {
    board.markers[id] = {
      id,
      stringIndex,
      fret,
      noteIndex: getPositionNoteIndex(stringIndex, fret, getActiveTuning()),
      interval: "",
      customLabel: null,
      isRecorderRoot: false,
    };
    board.selectedId = id;
    board.selectedIds = [];
  }
  renderMarkers();
  updateMarkerHint();
  renderRecorderPanel();
}

function ensureMarker(boardIndex, stringIndex, fret, { recordHistory = true } = {}) {
  const normalizedBoardIndex = normalizeBoardIndex(boardIndex);
  const board = getBoardState(normalizedBoardIndex);
  const id = `${stringIndex}-${fret}`;
  let created = false;
  if (!board.markers[id]) {
    if (recordHistory) {
      rememberBoardHistory(normalizedBoardIndex);
    }
    board.markers[id] = {
      id,
      stringIndex,
      fret,
      noteIndex: getPositionNoteIndex(stringIndex, fret, getActiveTuning()),
      interval: "",
      customLabel: null,
      isRecorderRoot: false,
    };
    created = true;
  }
  board.selectedId = id;
  board.selectedIds = [];
  return {
    id,
    created,
  };
}

function setRecorderRootMarker(boardIndex, markerId) {
  const normalizedBoardIndex = normalizeBoardIndex(boardIndex);
  const board = getBoardState(normalizedBoardIndex);
  const marker = board.markers[markerId];
  if (!marker) {
    return false;
  }
  marker.isRecorderRoot = true;
  recorder.rootMarkerId = markerId;
  recorder.output = "";
  renderMarkers();
  renderRecorderPanel();
  return true;
}

function clearPendingSvgClick() {
  if (!pendingSvgClick?.timer) {
    pendingSvgClick = null;
    return;
  }
  clearTimeout(pendingSvgClick.timer);
  pendingSvgClick = null;
}

function closeEnharmonicMenu() {
  if (!enharmonicMenuState) {
    return;
  }
  document.removeEventListener("pointermove", handleMenuPointerMove);
  document.removeEventListener("pointerup", handleMenuPointerUp);
  enharmonicMenuState.element.remove();
  enharmonicMenuState = null;
}

function highlightMenuItem(item) {
  const menu = enharmonicMenuState?.element;
  if (!menu || !item) {
    return;
  }
  menu.querySelectorAll(".enharmonic-menu__item").forEach((entry) => {
    entry.classList.toggle("is-active", entry === item);
  });
}

function handleMenuPointerMove(event) {
  if (!enharmonicMenuState) {
    return;
  }
  const item = event.target.closest(".enharmonic-menu__item");
  if (item && enharmonicMenuState.element.contains(item)) {
    highlightMenuItem(item);
  }
}

function handleMenuPointerUp(event) {
  if (!enharmonicMenuState) {
    return;
  }
  const menu = enharmonicMenuState.element;
  const active = menu.querySelector(".enharmonic-menu__item.is-active");
  event.preventDefault();
  if (active) {
    const board = getBoardState(enharmonicMenuState.boardIndex);
    const marker = board.markers[enharmonicMenuState.markerId];
    if (marker) {
      const nextLabel = `${active.dataset.label ?? ""}`;
      if (marker.customLabel !== nextLabel) {
        rememberBoardHistory(enharmonicMenuState.boardIndex);
        marker.customLabel = nextLabel;
        renderMarkers();
        renderRecorderPanel();
      }
    }
    longPressSuppressedId = {
      boardIndex: enharmonicMenuState.boardIndex,
      markerId: enharmonicMenuState.markerId,
    };
  }
  closeEnharmonicMenu();
}

function showEnharmonicMenu(markerId, boardIndex) {
  const board = getBoardState(boardIndex);
  const marker = board.markers[markerId];
  if (!marker) {
    return;
  }
  closeEnharmonicMenu();
  const options = getEnharmonicOptions(marker.noteIndex);
  const menu = document.createElement("div");
  menu.className = "enharmonic-menu";
  options.forEach((label, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "enharmonic-menu__item";
    item.dataset.label = label;
    item.textContent = label;
    if (index === 0) {
      item.classList.add("is-active");
    }
    menu.appendChild(item);
  });
  document.body.appendChild(menu);
  menu.style.left = `${longPressPointer.x}px`;
  menu.style.top = `${longPressPointer.y}px`;
  clearPendingSelectedMarkerDrag();
  enharmonicMenuState = {
    markerId,
    boardIndex: normalizeBoardIndex(boardIndex),
    element: menu,
  };
  document.addEventListener("pointermove", handleMenuPointerMove);
  document.addEventListener("pointerup", handleMenuPointerUp);
}

function startLongPress(markerId, event, boardIndex) {
  cancelLongPress();
  longPressTargetId = markerId;
  longPressPointer = { x: event.clientX, y: event.clientY };
  longPressTimer = setTimeout(() => {
    longPressTimer = null;
    longPressTargetId = null;
    showEnharmonicMenu(markerId, boardIndex);
  }, LONG_PRESS_MS);
}

function cancelLongPress() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  longPressTargetId = null;
}


function createOpenCell(stringIndex) {
  const x = getOpenAreaX();
  const y = getCellY(stringIndex);
  return `<rect class="cell open-cell" data-string="${stringIndex}" data-fret="0" x="${x}" y="${y}" width="${DIMENSIONS.openWidth}" height="${getStringSpacing()}"></rect>`;
}

function createFretCell(stringIndex, fret) {
  const x = getFretX(fret);
  const y = getCellY(stringIndex);
  return `<rect class="cell fret-cell" data-string="${stringIndex}" data-fret="${fret}" x="${x}" y="${y}" width="${DIMENSIONS.fretSpacing}" height="${getStringSpacing()}"></rect>`;
}

function renderGrid() {
  const svgs = getFretboardSvgs();
  if (!svgs.length) {
    return;
  }
  const { fretCount } = state;
  const visibleFretStart = getVisibleFretStart();
  const visibleFretNumbers = Array.from({ length: getVisibleFretCount() }, (_, index) => visibleFretStart + index);
  const showOpenFret = isOpenFretVisible();
  const tuning = getActiveTuning();
  const stringCount = getStringCount();
  const width = DIMENSIONS.fretSpacing;
  const labelOffset = 26;
  const topY = getStringY(stringCount - 1);
  const bottomY = getStringY(0);
  const boardHeight = Math.max(bottomY - topY, 0);
  const totalWidth = getTotalBoardWidth(fretCount);
  const totalHeight = bottomY + DIMENSIONS.boardPadding + labelOffset;
  const orientationFrame = getFretboardOrientationFrame(totalWidth, totalHeight);
  const clipId = "fretboardClip";
  const nutX = getNutX(fretCount);
  const openAreaX = getOpenAreaX(fretCount);
  const fretboardAreaX = getFretboardAreaX(fretCount);

  const stringLines = tuning.map((_, index) => {
    const y = getStringY(index);
    const x1 = fretboardAreaX;
    const x2 = fretboardAreaX + width * visibleFretNumbers.length;
    const cx = (x1 + x2) / 2 + sketchJitter(200 + index, 12);
    const cy = y + sketchJitter(400 + index, 3);
    const y1 = y + sketchJitter(600 + index, 1.8);
    const y2 = y + sketchJitter(800 + index, 1.8);
    return `<path class="string-line" d="M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}"></path>`;
  });

  const fretLines = visibleFretNumbers.map((fretNumber, fretIndex) => {
      const x = getFretX(fretNumber);
      const xTop = x + sketchJitter(1000 + fretNumber, 1.2);
      const xBottom = x + sketchJitter(1200 + fretNumber, 1.2);
      const cx = x + sketchJitter(1400 + fretNumber, 4);
      const cy = (topY + bottomY) / 2 + sketchJitter(1600 + fretNumber, 8);
      return `<path class="fret-line" d="M ${xTop} ${topY} Q ${cx} ${cy} ${xBottom} ${bottomY}"></path>`;
    });

  const fretLabels = visibleFretNumbers.map((fretNumber) => {
    const x = getFretX(fretNumber) + width / 2;
    const y =
      Number(state.fretboardOrientation) === FRETBOARD_ORIENTATION_RIGHT
        ? Math.max(14, topY - 10)
        : bottomY + labelOffset - 6;
    return `<text class="fret-label" x="${x}" y="${y}"${getSvgTextTransformAttr(x, y)}>${fretNumber}</text>`;
  });

  const openCells = showOpenFret ? tuning.map((_, stringIndex) => createOpenCell(stringIndex)) : [];
  const fretCells = tuning.flatMap((_, stringIndex) => visibleFretNumbers.map((fretNumber) => createFretCell(stringIndex, fretNumber)));
  const fretboardInlays = createFretboardInlays(visibleFretStart, fretCount, width);

  const openNoteLabels = showOpenFret ? tuning.map((_, stringIndex) => {
    const note = getDisplayLabelForNoteIndex(getPositionNoteIndex(stringIndex, 0, tuning));
    const x = getOpenAreaX(fretCount) + DIMENSIONS.openWidth / 2;
    const y = getStringY(stringIndex) + 5;
    return `<text class="open-note${isMovableDoEnabled() ? " numeric-label" : ""}" x="${x}" y="${y}"${getSvgTextTransformAttr(x, y)}>${note}</text>`;
  }) : [];

  const boardMarkup = `
    <g clip-path="url(#${clipId})">
      ${showOpenFret ? `<rect class="open-area" x="${openAreaX}" y="${topY}" width="${DIMENSIONS.openWidth}" height="${boardHeight}"></rect>` : ""}
      <rect class="fretboard-area" x="${fretboardAreaX}" y="${topY}" width="${width * visibleFretNumbers.length}" height="${boardHeight}"></rect>
      ${fretboardInlays}
    </g>
    ${!showOpenFret ? `<line class="nut-line" x1="${fretboardAreaX}" y1="${topY}" x2="${fretboardAreaX}" y2="${bottomY}"></line>` : ""}
    ${fretLines.join("")}
    ${showOpenFret ? `<line class="nut-line" x1="${nutX}" y1="${topY}" x2="${nutX}" y2="${bottomY}"></line>` : ""}
    ${openCells.join("")}
    ${fretCells.join("")}
    ${openNoteLabels.join("")}
    ${fretLabels.join("")}
    ${stringLines.join("")}
  `;
  svgs.forEach((svg) => {
    const transformAttr = orientationFrame.transform ? ` transform="${orientationFrame.transform}"` : "";
    svg.dataset.boardOrientation = getBoardOrientationName();
    svg.setAttribute("viewBox", `0 0 ${orientationFrame.viewWidth} ${orientationFrame.viewHeight}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.innerHTML = `
      <defs>
        <clipPath id="${clipId}">
          <rect x="0" y="${topY}" width="${totalWidth}" height="${boardHeight}"></rect>
        </clipPath>
      </defs>
      <g class="board-content"${transformAttr}>
        ${boardMarkup}
      </g>
    `;
  });
  if (dom.boardFretboard) {
    dom.boardFretboard.style.setProperty("--fretlab-string-count", `${stringCount}`);
    dom.boardFretboard.style.setProperty("--fretlab-board-height", `${Math.round(totalHeight)}`);
  }
}

function groupShapesForLibrary(shapes) {
  const categoryMap = new Map();
  shapes.forEach((shape) => {
    const categoryKey = shape.categoryId ?? "misc";
    if (!categoryMap.has(categoryKey)) {
      categoryMap.set(categoryKey, {
        id: categoryKey,
        label: shape.categoryLabel ?? "其他",
        order: shape.categoryOrder ?? 999,
        sections: new Map(),
        count: 0,
      });
    }
    const category = categoryMap.get(categoryKey);
    const sectionKey = `${shape.sectionId ?? "default"}`;
    if (!category.sections.has(sectionKey)) {
      category.sections.set(sectionKey, {
        id: sectionKey,
        label: shape.sectionLabel ?? t("library.ungrouped"),
        order: shape.sectionOrder ?? 999,
        shapes: [],
      });
    }
    category.sections.get(sectionKey).shapes.push(shape);
    category.count += 1;
  });

  return Array.from(categoryMap.values())
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map((category) => ({
      ...category,
      sections: Array.from(category.sections.values())
        .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
        .map((section) => ({
          ...section,
          shapes: section.shapes.sort(
            (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || a.name.localeCompare(b.name)
          ),
        })),
    }));
}

function escapeHtml(value) {
  return `${value ?? ""}`
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isChordLikeShape(shape) {
  const system = `${shape?.system ?? ""}`.toLowerCase();
  return (
    system.includes("chord") ||
    system.includes("drop ") ||
    system.includes("triad") ||
    system.includes("arpeggio") ||
    system.includes("shell voicing")
  );
}

function getLocalizedLibraryCategoryLabel(category) {
  const langMap = LIBRARY_CATEGORY_LABELS[state.language] ?? LIBRARY_CATEGORY_LABELS.zh;
  return langMap?.[category?.id] ?? category?.label ?? "";
}

function getLocalizedLibrarySectionLabel(section) {
  const langMap = LIBRARY_SECTION_LABELS[state.language] ?? LIBRARY_SECTION_LABELS.zh;
  return langMap?.[section?.id] ?? section?.label ?? "";
}

function getLocalizedShapeName(shape) {
  if (!shape) {
    return "";
  }
  const id = `${shape.id ?? ""}`;
  const rawName = `${shape.name ?? ""}`;
  const isZh = state.language === "zh";
  if (getActiveInstrument().id === "bass" && id === "dim7_chord_root_6") {
    return "";
  }

  const cagedMatch = id.match(/^caged_chord_([a-g])_form$/i);
  if (cagedMatch) {
    const letter = cagedMatch[1].toUpperCase();
    return isZh ? `${letter}型和弦` : `${letter} Form Chord`;
  }

  const majorScaleFiveMatch = id.match(/^major_scale_5_([a-z])_form$/i);
  if (majorScaleFiveMatch) {
    const rawLetter = majorScaleFiveMatch[1].toLowerCase();
    const letterMap = { e: "C", g: "A", a: "G", b: "E", d: "D" };
    const letter = letterMap[rawLetter] ?? rawLetter.toUpperCase();
    return isZh ? `${letter}指型` : `${letter} Form`;
  }

  const pentBoxMatch = id.match(/^minor_pent_box_(\d+)$/);
  if (pentBoxMatch) {
    const n = pentBoxMatch[1];
    return isZh ? `第${n}把位` : `Box ${n}`;
  }

  const bluesBoxMatch = id.match(/^blues_scale_box_(\d+)$/);
  if (bluesBoxMatch) {
    const n = bluesBoxMatch[1];
    return isZh ? `第${n}把位` : `Box ${n}`;
  }

  const arpeggioOrShapeNumberMatch = rawName.match(/^Shape\s+(\d+)$/i);
  if (arpeggioOrShapeNumberMatch) {
    const n = arpeggioOrShapeNumberMatch[1];
    return isZh ? `形状 ${n}` : `Shape ${n}`;
  }

  const rootOnStringMatch = rawName.match(/^Root on (\d)(?:st|nd|rd|th)$/i);
  if (rootOnStringMatch) {
    const stringNo = rootOnStringMatch[1];
    return isZh ? `根音在${stringNo}弦` : rawName;
  }

  const dimScaleNameMatch = id.match(/^diminished_scale_(st|ts)_/i);
  if (dimScaleNameMatch) {
    const pattern = dimScaleNameMatch[1].toUpperCase();
    if (isZh) {
      return pattern === "ST" ? "减音阶 半音-全音" : "减音阶 全音-半音";
    }
    return pattern === "ST" ? "Diminished Scale (Half-Whole)" : "Diminished Scale (Whole-Half)";
  }

  const susShapeSystemMatch = id.match(/^sus_chords_(sus2|sus4)_(drop2|drop3|triads)$/i);
  if (susShapeSystemMatch) {
    const systemKey = susShapeSystemMatch[2].toLowerCase();
    if (systemKey === "triads") {
      return isZh ? "三和弦" : "Triads";
    }
    return systemKey === "drop2" ? "Drop 2" : "Drop 3";
  }

  const inversionName = INVERSION_NAME_LABELS[state.language]?.[rawName];
  if (inversionName) {
    return inversionName;
  }

  if (id === "pentatonic_grouping_3_plus_2") {
    return "3 + 2";
  }
  if (id === "pentatonic_grouping_2_plus_3") {
    return "2 + 3";
  }

  return rawName;
}

function groupCategoriesByLibraryFamily(categories) {
  const families = [
    { id: "scales", label: t("library.family.scales"), order: 1, categories: [], count: 0 },
    { id: "chords", label: t("library.family.chords"), order: 2, categories: [], count: 0 },
  ];
  const familyById = new Map(families.map((family) => [family.id, family]));

  categories.forEach((category) => {
    const sampleShape = category.sections?.[0]?.shapes?.[0];
    const familyId = isChordLikeShape(sampleShape) ? "chords" : "scales";
    const family = familyById.get(familyId);
    family.categories.push(category);
    family.count += category.count ?? 0;
  });

  return families
    .sort((a, b) => a.order - b.order)
    .filter((family) => family.categories.length > 0);
}

function renderShapeThumbnail(shape) {
  const positions = shape?.positions ?? [];
  if (!positions.length) {
    return `<div class="shape-thumb shape-thumb--empty"></div>`;
  }

  const width = 146;
  const height = 78;
  const padX = 13;
  const padY = 10;
  const strings = getStringCount();
  const rowGap = (height - padY * 2) / (strings - 1);
  const frets = positions.map((pos) => pos.fret);
  let minFret = Math.min(...frets);
  let maxFret = Math.max(...frets);
  if (maxFret - minFret < 3) {
    maxFret = minFret + 3;
  }
  const cellCount = Math.max(2, maxFret - minFret + 1);
  const lineCount = cellCount + 1;
  const colGap = (width - padX * 2) / cellCount;
  const dotRadius = Math.min(5.1, Math.max(3.4, Math.min(rowGap * 0.42, colGap * 0.32)));
  const rootDotRadius = Math.max(
    dotRadius,
    Math.min(5.8, rowGap * 0.46, colGap * 0.36, dotRadius + 0.55)
  );

  const stringLines = Array.from({ length: strings }, (_, visualIndex) => {
    const y = padY + visualIndex * rowGap;
    return `<line class="shape-thumb__string" x1="${padX}" y1="${y}" x2="${width - padX}" y2="${y}"></line>`;
  }).join("");

  const fretLines = Array.from({ length: lineCount }, (_, index) => {
    const x = padX + index * colGap;
    return `<line class="shape-thumb__fret" x1="${x}" y1="${padY - 2}" x2="${x}" y2="${height - padY + 2}"></line>`;
  }).join("");

  const dots = positions
    .map((pos) => {
      const x = padX + (pos.fret - minFret + 0.5) * colGap;
      const y = padY + getVisualStringIndex(pos.string + (shape.anchorString ?? 0)) * rowGap;
      const isRoot = pos.interval === 0;
      const label = isMovableDoEnabled() ? getMovableDoLabelFromSemitone(pos.interval) : "";
      return `
        <circle class="shape-thumb__dot${isRoot ? " is-root" : ""}" cx="${x}" cy="${y}" r="${isRoot ? rootDotRadius : dotRadius}"></circle>
        ${label ? `<text class="shape-thumb__label numeric-label${isRoot ? " is-root" : ""}" x="${x}" y="${y}">${escapeHtml(label)}</text>` : ""}
      `;
    })
    .join("");

  return `
    <div class="shape-thumb" aria-hidden="true">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
        <rect class="shape-thumb__bg" x="1" y="1" width="${width - 2}" height="${height - 2}" rx="10" ry="10"></rect>
        ${stringLines}
        ${fretLines}
        ${dots}
      </svg>
    </div>
  `;
}

function renderLibraryCategory(category) {
  const sections = category.sections ?? [];
  const categoryId = `${category?.id ?? ""}`;
  const isBassInstrument = getActiveInstrument().id === "bass";
  const bassStaticCategoryIds = new Set(["major-scale", "melodic-minor-scale", "harmonic-minor-scale"]);
  const shouldUseBassStaticMode = isBassInstrument && bassStaticCategoryIds.has(categoryId);

  const renderShapeCards = (shapes) =>
    (shapes ?? [])
      .map((shape) => {
        const shapeTitle = `${getLocalizedShapeName(shape)}`.trim();
        return `
                <div class="shape-card" draggable="true" data-shape="${escapeHtml(shape.id)}">
                  ${shapeTitle ? `<h3>${escapeHtml(shapeTitle)}</h3>` : ""}
                  ${renderShapeThumbnail(shape)}
                </div>
              `
      })
      .join("");

  const renderSection = (section, options = {}) => {
    const label = `${options.label ?? getLocalizedLibrarySectionLabel(section)}`.trim();
    const shapeCount = section?.shapes?.length ?? 0;
    const staticSectionCategoryIds = new Set(["whole-tone-scale", "caged", "dim7-chords"]);
    if (shouldUseBassStaticMode) {
      staticSectionCategoryIds.add("major-scale");
      staticSectionCategoryIds.add("melodic-minor-scale");
      staticSectionCategoryIds.add("harmonic-minor-scale");
    }
    const isStaticSectionCategory = staticSectionCategoryIds.has(`${category?.id ?? ""}`);
    if (isStaticSectionCategory) {
      return `
          <div class="shape-section shape-section--flat">
            <div class="shape-grid">
              ${renderShapeCards(section.shapes)}
            </div>
          </div>
        `;
    }
    return `
          <details class="shape-section">
            <summary class="shape-section__summary">
              <span>${escapeHtml(label)}</span>
              <span>${escapeHtml(formatCount(shapeCount))}</span>
            </summary>
            <div class="shape-grid">
              ${renderShapeCards(section.shapes)}
            </div>
          </details>
        `;
  };

  const stripSusSectionPrefix = (label = "") => `${label}`.replace(/^Sus[24]\s*[·•-]\s*/i, "").trim();

  const renderSectionGroup = (groupLabel, groupSections, labelResolver = null) => {
    const normalizedSections = groupSections ?? [];
    if (!normalizedSections.length) {
      return "";
    }
    const groupCount = normalizedSections.reduce((sum, section) => sum + (section?.shapes?.length ?? 0), 0);
    return `
      <details class="shape-subsection">
        <summary class="shape-subsection__summary">
          <span class="shape-subsection__title">${escapeHtml(groupLabel)}</span>
          <span class="shape-subsection__count">${escapeHtml(formatCount(groupCount))}</span>
        </summary>
        ${normalizedSections
          .map((section) =>
            renderSection(section, {
              label: labelResolver ? labelResolver(section) : getLocalizedLibrarySectionLabel(section),
            })
          )
          .join("")}
      </details>
    `;
  };

  const renderCategoryBody = () => {
    const categoryId = `${category.id}`;
    if (categoryId === "sus-chords") {
      const sus2Sections = sections.filter((section) => `${section.id}`.startsWith("sus2-"));
      const sus4Sections = sections.filter((section) => `${section.id}`.startsWith("sus4-"));
      const otherSections = sections.filter(
        (section) => !`${section.id}`.startsWith("sus2-") && !`${section.id}`.startsWith("sus4-")
      );

      return `
        ${renderSectionGroup("Sus2", sus2Sections, (section) =>
          stripSusSectionPrefix(getLocalizedLibrarySectionLabel(section))
        )}
        ${renderSectionGroup("Sus4", sus4Sections, (section) =>
          stripSusSectionPrefix(getLocalizedLibrarySectionLabel(section))
        )}
        ${otherSections.map((section) => renderSection(section)).join("")}
      `;
    }

    if (categoryId === "shell-voicing") {
      const seventhSections = sections.filter((section) => `${section.id}`.startsWith("shell-seventh-"));
      const triadSections = sections.filter((section) => `${section.id}`.startsWith("shell-triad-"));
      const otherSections = sections.filter(
        (section) =>
          !`${section.id}`.startsWith("shell-seventh-") && !`${section.id}`.startsWith("shell-triad-")
      );
      const fallbackSeventhLabel = state.language === "zh" ? "七和弦" : "Seventh Chords";
      const fallbackTriadLabel = state.language === "zh" ? "三和弦" : "Triads";
      const seventhLabel =
        (LIBRARY_SECTION_LABELS[state.language] ?? LIBRARY_SECTION_LABELS.zh)?.["shell-voicing-seventh"] ??
        fallbackSeventhLabel;
      const triadLabel =
        (LIBRARY_SECTION_LABELS[state.language] ?? LIBRARY_SECTION_LABELS.zh)?.["shell-voicing-triads"] ??
        fallbackTriadLabel;

      return `
        ${renderSectionGroup(seventhLabel, seventhSections)}
        ${renderSectionGroup(triadLabel, triadSections)}
        ${otherSections.map((section) => renderSection(section)).join("")}
      `;
    }

    return sections.map((section) => renderSection(section)).join("");
  };

  return `
    <details class="shape-group">
      <summary class="shape-group__summary">
        <span class="shape-group__title">${escapeHtml(getLocalizedLibraryCategoryLabel(category))}</span>
        <span class="shape-group__count">${escapeHtml(formatCount(category.count))}</span>
      </summary>
      <div class="shape-group__body">
        ${renderCategoryBody()}
      </div>
    </details>
  `;
}

function groupFamilyCategoriesForDisplay(family) {
  return (family?.categories ?? []).map((category) => ({ type: "category", category }));
}

function renderFamilyCategoryItem(item) {
  if (!item) {
    return "";
  }
  if (item.type === "category") {
    return renderLibraryCategory(item.category);
  }
  if (item.type === "cluster") {
    return `
      <details class="shape-group shape-group--cluster">
        <summary class="shape-group__summary">
          <span class="shape-group__title">${escapeHtml(item.label)}</span>
          <span class="shape-group__count">${escapeHtml(formatCount(item.count))}</span>
        </summary>
        <div class="shape-group__body">
          ${(item.categories ?? []).map((category) => renderLibraryCategory(category)).join("")}
        </div>
      </details>
    `;
  }
  return "";
}

function buildShapeLibrary() {
  if (!dom.shapeLibrary) {
    return;
  }
  const categories = groupShapesForLibrary(getActiveShapes());
  const families = groupCategoriesByLibraryFamily(categories);
  dom.shapeLibrary.innerHTML = families
    .map(
      (family) => `
      <details class="shape-family">
        <summary class="shape-family__summary">
          <span class="shape-family__title">${escapeHtml(family.label)}</span>
          <span class="shape-family__count">${escapeHtml(formatCount(family.count))}</span>
        </summary>
        <div class="shape-family__body">
          ${groupFamilyCategoriesForDisplay(family).map((item) => renderFamilyCategoryItem(item)).join("")}
        </div>
      </details>
    `
    )
    .join("");
}

function handleShapeDragStart(event) {
  if (!ensureFullAccess("library")) {
    event.preventDefault();
    return;
  }
  const card = event.target.closest(".shape-card");
  if (!card) {
    return;
  }
  dragShapeId = card.dataset.shape;
  dragOverlayPreview = null;
  event.dataTransfer.setData("text/plain", card.dataset.shape);
  event.dataTransfer.effectAllowed = "copy";
  if (state.paletteOpen) {
    dom.paletteBackdrop?.classList.add("is-drag-pass-through");
  }
  if (event.dataTransfer?.setDragImage) {
    event.dataTransfer.setDragImage(getTransparentDragImage(), 0, 0);
  }
}

function clearDragOverlayPreview() {
  dragOverlayPreview = null;
  renderOverlays();
}

function resetTouchShapeDrag({ clearPreview = true } = {}) {
  if (touchShapeDrag.sourceCard && touchShapeDrag.pointerId !== null) {
    try {
      if (touchShapeDrag.sourceCard.hasPointerCapture?.(touchShapeDrag.pointerId)) {
        touchShapeDrag.sourceCard.releasePointerCapture(touchShapeDrag.pointerId);
      }
    } catch {
      // ignore pointer capture release failures
    }
  }
  touchShapeDrag.active = false;
  touchShapeDrag.pointerId = null;
  touchShapeDrag.shapeId = null;
  touchShapeDrag.sourceCard = null;
  dragShapeId = null;
  dom.paletteBackdrop?.classList.remove("is-drag-pass-through");
  if (clearPreview) {
    clearDragOverlayPreview();
  }
}

function getBoardSvgFromClientPoint(clientX, clientY) {
  const target = document.elementFromPoint(clientX, clientY);
  if (!(target instanceof Element)) {
    return null;
  }
  const svg = target.closest(".fretboard-svg");
  return svg instanceof SVGSVGElement ? svg : null;
}

function getCellFromClientPoint(clientX, clientY, svg) {
  if (!(svg instanceof SVGSVGElement)) {
    return null;
  }
  const target = document.elementFromPoint(clientX, clientY);
  if (!(target instanceof Element)) {
    return null;
  }
  const cell = target.closest(".cell");
  if (!(cell instanceof Element) || !svg.contains(cell)) {
    return null;
  }
  const stringIndex = Number(cell.dataset.string);
  const fret = Number(cell.dataset.fret);
  if (Number.isNaN(stringIndex) || Number.isNaN(fret)) {
    return null;
  }
  return { stringIndex, fret };
}

function updateTouchShapeDragPreview(clientX, clientY) {
  if (!touchShapeDrag.active || !touchShapeDrag.shapeId) {
    return;
  }
  const shape = getShapeById(touchShapeDrag.shapeId);
  if (!shape) {
    return;
  }
  const svg = getBoardSvgFromClientPoint(clientX, clientY);
  if (!svg) {
    clearDragOverlayPreview();
    return;
  }
  const cell = getCellFromClientPoint(clientX, clientY, svg);
  if (!cell) {
    clearDragOverlayPreview();
    return;
  }
  setActiveBoard(getBoardIndexFromSvg(svg), { resetRecorder: false });
  const placement = resolveShapePlacement(shape, cell);
  if (!placement) {
    clearDragOverlayPreview();
    return;
  }
  dragOverlayPreview = {
    shapeId: touchShapeDrag.shapeId,
    ...placement,
  };
  renderOverlays();
}

function commitTouchShapeDrop() {
  if (!touchShapeDrag.active || !touchShapeDrag.shapeId) {
    return;
  }
  const preview =
    dragOverlayPreview && dragOverlayPreview.shapeId === touchShapeDrag.shapeId ? dragOverlayPreview : null;
  if (preview) {
    addOverlay(touchShapeDrag.shapeId, preview.anchorString, preview.anchorFret, {
      positionsOverride: preview.positions,
      dragStringSetStart: preview.dragStringSetStart,
    });
  }
  resetTouchShapeDrag({ clearPreview: true });
}

function handleShapePointerDown(event) {
  if (event.pointerType === "mouse") {
    return;
  }
  const card = event.target.closest(".shape-card");
  if (!card) {
    return;
  }
  if (!ensureFullAccess("library")) {
    event.preventDefault();
    return;
  }
  const shapeId = `${card.dataset.shape ?? ""}`.trim();
  if (!shapeId) {
    return;
  }
  event.preventDefault();
  resetTouchShapeDrag({ clearPreview: true });
  touchShapeDrag.active = true;
  touchShapeDrag.pointerId = event.pointerId;
  touchShapeDrag.shapeId = shapeId;
  touchShapeDrag.sourceCard = card;
  dragShapeId = shapeId;
  if (state.paletteOpen) {
    dom.paletteBackdrop?.classList.add("is-drag-pass-through");
  }
  try {
    card.setPointerCapture?.(event.pointerId);
  } catch {
    // ignore capture failures
  }
  updateTouchShapeDragPreview(event.clientX, event.clientY);
}

function handleShapePointerMove(event) {
  if (!touchShapeDrag.active || touchShapeDrag.pointerId !== event.pointerId) {
    return;
  }
  event.preventDefault();
  updateTouchShapeDragPreview(event.clientX, event.clientY);
}

function handleShapePointerUp(event) {
  if (!touchShapeDrag.active || touchShapeDrag.pointerId !== event.pointerId) {
    return;
  }
  event.preventDefault();
  commitTouchShapeDrop();
}

function handleShapePointerCancel(event) {
  if (!touchShapeDrag.active || touchShapeDrag.pointerId !== event.pointerId) {
    return;
  }
  event.preventDefault();
  resetTouchShapeDrag({ clearPreview: true });
}

const EXPORT_SVG_INLINE_STYLE = `
  svg { width: 100%; height: 100%; overflow: visible; background: #ffffff; }
  .open-area { fill: #fbfbf8; }
  .fretboard-area { fill: #ffffff; }
  .fret-inlay-group { pointer-events: none; opacity: 0.82; }
  .fret-inlay-dot--fill { fill: rgba(17,17,17,0.08); stroke: none; }
  .fret-inlay-dot--stroke { fill: none; stroke: rgba(17,17,17,0.30); stroke-width: 1.15; }
  .string-line, .fret-line { stroke: rgba(120,120,120,0.9); stroke-width: 1.35; stroke-linecap: round; fill: none; }
  .nut-line { stroke: #111; stroke-width: 3; stroke-linecap: round; }
  .fret-label {
    font-size: 0.7rem; fill: #666; text-anchor: middle;
    font-family: "Patrick Hand","Xiaolai SC","Xiaolai","HanziPen SC","PingFang SC","Hiragino Sans GB","Microsoft YaHei",cursive,sans-serif;
  }
  .open-note {
    font-size: 0.82rem; font-weight: 400; fill: #666; text-anchor: middle;
    font-family: "Patrick Hand","Xiaolai SC","Xiaolai","HanziPen SC","PingFang SC","Hiragino Sans GB","Microsoft YaHei",cursive,sans-serif;
  }
  .numeric-label {
    font-family: ${NUMERIC_LABEL_FONT_STACK};
    font-weight: 400;
    letter-spacing: 0.01em;
  }
  .marker-group { pointer-events: none; }
  .marker-dot { fill: #fff; stroke: #111; stroke-width: 2.2; }
  .marker-dot.marker-open { fill: #fff7d1; stroke: #111; stroke-width: 1.5; }
  .marker-dot.marker-recorder-root { fill: #ede3a3; stroke-width: 2.6; }
  .marker-highlight { fill: none; stroke: #111; stroke-width: 2.4; stroke-dasharray: 4 4; }
  .marker-note { font-size: 0.92rem; font-weight: 600; fill: #111; text-anchor: middle; dominant-baseline: middle; }
  .marker-interval { font-size: 0.65rem; fill: #777; text-anchor: middle; }
  .realtime-note-text { fill: #111; font-size: 0.9rem; font-weight: 600; text-anchor: middle; dominant-baseline: middle; }
  .overlay-group { pointer-events: none; }
  .overlay-dot { fill: #fff; stroke: #111; stroke-width: 2.2; }
  .overlay-root { fill: #ede3a3; stroke: #111; stroke-width: 2; }
  .overlay-note-text {
    fill: #111; font-size: 0.92rem; font-weight: 600;
    text-anchor: middle; dominant-baseline: middle; pointer-events: none;
  }
  .overlay-note-text--root { font-weight: 600; }
`;

function getExportFilename(ext) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(
    now.getMinutes()
  )}${pad(now.getSeconds())}`;
  return `ic-fretlab-board-${stamp}.${ext}`;
}

function buildExportSvgMarkup() {
  const sourceSvg = getFretboardSvgs()[state.activeBoardIndex] ?? dom.svg;
  if (!sourceSvg) {
    return null;
  }
  const clone = sourceSvg.cloneNode(true);
  clone.querySelectorAll(".cell, .overlay-preview-group").forEach((node) => node.remove());

  const viewBoxAttr = sourceSvg.getAttribute("viewBox") || clone.getAttribute("viewBox");
  const viewBoxParts = (viewBoxAttr || "")
    .trim()
    .split(/\s+/)
    .map(Number)
    .filter((n) => !Number.isNaN(n));
  const width = viewBoxParts.length === 4 ? viewBoxParts[2] : sourceSvg.clientWidth || 1200;
  const height = viewBoxParts.length === 4 ? viewBoxParts[3] : sourceSvg.clientHeight || 420;

  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("width", `${width}`);
  clone.setAttribute("height", `${height}`);

  let defs = clone.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    clone.insertBefore(defs, clone.firstChild);
  }
  const styleNode = document.createElementNS("http://www.w3.org/2000/svg", "style");
  styleNode.textContent = EXPORT_SVG_INLINE_STYLE;
  defs.appendChild(styleNode);

  const serializer = new XMLSerializer();
  const markup = serializer.serializeToString(clone);
  return { markup, width, height };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function renderExportCanvas(scale = 2) {
  const exported = buildExportSvgMarkup();
  if (!exported) {
    throw new Error("unavailable");
  }
  const { markup, width, height } = exported;
  const svgBlob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("render"));
      img.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("render");
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(image, 0, 0, width, height);
    return { canvas, width, height, svgMarkup: markup };
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function exportFretboardAsSvg() {
  const exported = buildExportSvgMarkup();
  if (!exported) {
    throw new Error("unavailable");
  }
  downloadBlob(new Blob([exported.markup], { type: "image/svg+xml;charset=utf-8" }), getExportFilename("svg"));
}

async function exportFretboardAsPng() {
  const { canvas } = await renderExportCanvas(2);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) {
    throw new Error("render");
  }
  downloadBlob(blob, getExportFilename("png"));
}

async function exportFretboardAsPdf() {
  const popup = window.open("", "_blank");
  if (!popup) {
    throw new Error("popup");
  }
  const { canvas, width, height } = await renderExportCanvas(2);
  const pngDataUrl = canvas.toDataURL("image/png");
  popup.document.open();
  popup.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>IC Fretboard Lab Export</title>
    <style>
      @page { size: auto; margin: 10mm; }
      html, body { margin: 0; padding: 0; background: #fff; }
      body { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
      img { display: block; max-width: calc(100vw - 20mm); max-height: calc(100vh - 20mm); width: auto; height: auto; }
      .wrap { padding: 10mm; }
      @media print { .wrap { padding: 0; } }
    </style>
  </head>
  <body>
    <div class="wrap">
      <img src="${pngDataUrl}" alt="Fretboard export" width="${Math.round(width)}" height="${Math.round(height)}" />
    </div>
    <script>
      window.addEventListener('load', () => {
        setTimeout(() => window.print(), 60);
      });
    <\/script>
  </body>
</html>`);
  popup.document.close();
}

async function handleBoardExport(format = "png") {
  if (!ensureFullAccess("export")) {
    setExportMenuOpen(false);
    return;
  }
  try {
    if (format === "svg") {
      exportFretboardAsSvg();
      return;
    }
    if (format === "pdf") {
      await exportFretboardAsPdf();
      return;
    }
    await exportFretboardAsPng();
  } catch (error) {
    const key = `export.error.${error?.message}` in (UI_TEXT[state.language] ?? {}) ? `export.error.${error.message}` : "export.error.render";
    window.alert(t(key));
  }
}

function getCellFromPointerEvent(event) {
  const targetSvg =
    event.target instanceof Element ? event.target.closest("svg") : null;
  const svg = event.currentTarget instanceof SVGSVGElement ? event.currentTarget : targetSvg ?? dom.svg;
  return getCellFromClientPoint(event.clientX, event.clientY, svg);
}

function getLockedAnchorString(shape, fallbackStringIndex) {
  if (Number.isInteger(shape?.anchorString)) {
    return Math.max(0, Math.min(getStringCount() - 1, shape.anchorString));
  }
  return fallbackStringIndex;
}

function getPlacementVariantEntries(shape) {
  if (Array.isArray(shape?.dragPlacementVariantList) && shape.dragPlacementVariantList.length) {
    return shape.dragPlacementVariantList;
  }
  if (shape?.dragPlacementVariants && typeof shape.dragPlacementVariants === "object") {
    return buildVariantEntryListFromMap(shape.dragPlacementVariants);
  }
  if (Array.isArray(shape?.drop2VariantList) && shape.drop2VariantList.length) {
    return shape.drop2VariantList;
  }
  if (shape?.drop2Variants && typeof shape.drop2Variants === "object") {
    return buildVariantEntryListFromMap(shape.drop2Variants);
  }
  return [];
}

function getPlacementVariantRange(entry) {
  const offsets = (entry?.positions ?? []).map((pos) => Number(pos?.string)).filter((value) => Number.isFinite(value));
  const anchorString = Number(entry?.anchorString ?? 0);
  if (!offsets.length) {
    return { min: anchorString, max: anchorString };
  }
  return {
    min: anchorString + Math.min(...offsets),
    max: anchorString + Math.max(...offsets),
  };
}

function getPlacementVariantForPointer(shape, stringIndex) {
  const entries = getPlacementVariantEntries(shape);
  if (!entries.length) {
    return null;
  }
  const pointerString = Number(stringIndex);
  let bestVariant = null;
  let bestScore = Number.POSITIVE_INFINITY;

  entries.forEach((entry) => {
    const range = getPlacementVariantRange(entry);
    const distance =
      pointerString < range.min ? range.min - pointerString : pointerString > range.max ? pointerString - range.max : 0;
    const center = (range.min + range.max) / 2;
    const score = distance * 10 + Math.abs(pointerString - center);
    if (score < bestScore) {
      bestScore = score;
      bestVariant = entry;
    }
  });

  return bestVariant;
}

function normalizePlacementAnchorFret(anchorFret, positions) {
  const baseFret = Math.round(Number(anchorFret) || 0);
  const offsets = (positions ?? [])
    .map((entry) => Number(entry?.fret))
    .filter((value) => Number.isFinite(value));
  if (!offsets.length) {
    return Math.max(getVisibleMinimumFret(), baseFret);
  }
  const minOffset = Math.min(...offsets);
  const maxOffset = Math.max(...offsets);
  const minAnchor = Math.max(getVisibleMinimumFret(), getVisibleMinimumFret() - minOffset);
  const maxAnchor = Math.max(0, state.fretCount - maxOffset);
  if (maxAnchor < minAnchor) {
    return minAnchor;
  }
  return Math.min(maxAnchor, Math.max(minAnchor, baseFret));
}

function resolveShapePlacement(shape, cell) {
  if (!shape || !cell) {
    return null;
  }

  const placementVariant = getPlacementVariantForPointer(shape, cell.stringIndex);
  if (placementVariant) {
    const anchorString = placementVariant.anchorString;
    const anchorFret = normalizePlacementAnchorFret(cell.fret, placementVariant.positions);
    const positions = calculateStrictOverlayPlacement(placementVariant.positions, anchorString, anchorFret);
    if (!positions.length) {
      return null;
    }
    return {
      anchorString,
      anchorFret,
      positions,
      dragStringSetStart: Number(placementVariant.stringSetStart ?? 0),
    };
  }

  const anchorString = getLockedAnchorString(shape, cell.stringIndex);
  const anchorFret = normalizePlacementAnchorFret(cell.fret, shape.positions);
  const positions = calculateStrictOverlayPlacement(shape.positions, anchorString, anchorFret);
  if (!positions.length) {
    return null;
  }
  return { anchorString, anchorFret, positions };
}

function handleBoardDragOver(event) {
  event.preventDefault();
  setActiveBoard(getBoardIndexFromEvent(event), { resetRecorder: false });
  event.dataTransfer.dropEffect = "copy";
  const shapeId = event.dataTransfer.getData("text/plain") || dragShapeId;
  if (!shapeId) {
    return;
  }
  const cell = getCellFromPointerEvent(event) ?? {
    stringIndex: Number(event.target.closest(".cell")?.dataset.string),
    fret: Number(event.target.closest(".cell")?.dataset.fret),
  };
  if (Number.isNaN(cell.stringIndex) || Number.isNaN(cell.fret)) {
    return;
  }
  const shape = getShapeById(shapeId);
  if (!shape) {
    return;
  }
  const placement = resolveShapePlacement(shape, cell);
  if (!placement) {
    return;
  }
  dragOverlayPreview = {
    shapeId,
    ...placement,
  };
  renderOverlays();
}

function handleBoardDrop(event) {
  event.preventDefault();
  setActiveBoard(getBoardIndexFromEvent(event), { resetRecorder: false });
  dom.paletteBackdrop?.classList.remove("is-drag-pass-through");
  const shapeId = event.dataTransfer.getData("text/plain");
  if (!shapeId) {
    return;
  }
  const preview =
    dragOverlayPreview && dragOverlayPreview.shapeId === shapeId ? dragOverlayPreview : null;
  if (preview) {
    addOverlay(shapeId, preview.anchorString, preview.anchorFret, {
      positionsOverride: preview.positions,
      dragStringSetStart: preview.dragStringSetStart,
    });
  } else {
    const shape = getShapeById(shapeId);
    const cell = getCellFromPointerEvent(event) ?? event.target.closest(".cell");
    if (!cell) {
      clearDragOverlayPreview();
      return;
    }
    const stringIndex = Number(cell.stringIndex ?? cell.dataset.string);
    const fret = Number(cell.fret ?? cell.dataset.fret);
    const placement = resolveShapePlacement(shape, { stringIndex, fret });
    if (!placement) {
      clearDragOverlayPreview();
      return;
    }
    addOverlay(shapeId, placement.anchorString, placement.anchorFret, {
      positionsOverride: placement.positions,
      dragStringSetStart: placement.dragStringSetStart,
    });
  }
  dragShapeId = null;
  dragOverlayPreview = null;
  renderOverlays();
}

function handleOverlayListClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }
  const id = button.dataset.id;
  const overlay = overlays.find((entry) => entry.id === id);
  if (!overlay) {
    return;
  }
  if (button.dataset.action === "toggle") {
    overlay.visible = !overlay.visible;
  } else if (button.dataset.action === "delete") {
    const idx = overlays.findIndex((entry) => entry.id === id);
    overlays.splice(idx, 1);
  }
  renderOverlays();
  renderOverlayList();
}

function removeOverlayPosition(overlayId, stringIndex, fret) {
  const overlay = overlays.find((entry) => entry.id === overlayId);
  if (!overlay) {
    return false;
  }
  const beforeCount = overlay.positions.length;
  overlay.positions = overlay.positions.filter(
    (pos) => !(pos.stringIndex === stringIndex && pos.fret === fret)
  );
  if (overlay.positions.length === beforeCount) {
    return false;
  }

  if (!overlay.positions.length) {
    const overlayIndex = overlays.findIndex((entry) => entry.id === overlayId);
    if (overlayIndex >= 0) {
      overlays.splice(overlayIndex, 1);
    }
  }

  renderOverlays();
  renderOverlayList();
  return true;
}

function renderMarkers() {
  const svgs = getFretboardSvgs();
  if (!svgs.length) {
    return;
  }
  svgs.forEach((svg) => {
    svg.querySelectorAll(".marker-group").forEach((node) => node.remove());
  });

  svgs.forEach((svg) => {
    const boardIndex = getBoardIndexFromSvg(svg);
    const board = getBoardState(boardIndex);
    const selectedIds = new Set(getExistingMarkerIds(board, board.selectedIds));
    Object.values(board.markers).forEach((marker) => {
      const { stringIndex, fret } = marker;
      if (!isBoardFretVisible(fret)) {
        return;
      }
      const centerX = getMarkerCenterX(fret);
      const centerY = getStringY(stringIndex);
      const isRecorderRoot = Boolean(marker.isRecorderRoot);
      const noteLabel = getMarkerDisplayLabel(marker);
      const noteTransform = getSvgTextTransformAttr(centerX, centerY);
      const intervalLabel = marker.interval
        ? `<text class="marker-interval" x="${centerX}" y="${centerY + 22}"${getSvgTextTransformAttr(centerX, centerY + 22)}>${marker.interval}</text>`
        : "";

      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.classList.add("marker-group");
      if (selectedIds.has(marker.id)) {
        group.classList.add("is-selected");
      }
      group.dataset.id = `${stringIndex}-${fret}`;
      group.innerHTML = `
        <circle class="marker-dot marker-on ${fret === 0 ? "marker-open" : ""} ${isRecorderRoot ? "marker-recorder-root" : ""}" cx="${centerX}" cy="${centerY}" r="${MARKER_DOT_RADIUS}"></circle>
        <text class="marker-note${isMovableDoEnabled() ? " numeric-label" : ""}" x="${centerX}" y="${centerY}"${noteTransform}>${noteLabel}</text>
        ${intervalLabel}
      `;
      getBoardContentLayer(svg)?.appendChild(group);
    });
  });
  renderOverlays();
  renderRealtimeMarkers();
  renderSelectionMarquee();
}

function calculateOverlayPositions(shape, anchorString, anchorFret) {
  return shape.positions
    .map((offset) => {
      const stringIndex = anchorString + offset.string;
      const fret = anchorFret + offset.fret;
      if (
        stringIndex < 0 ||
        stringIndex >= getStringCount() ||
        !isBoardFretVisible(fret) ||
        fret > state.fretCount
      ) {
        return null;
      }
      return { stringIndex, fret, interval: offset.interval };
    })
    .filter(Boolean);
}

function calculateStrictOverlayPlacement(positions, anchorString, anchorFret) {
  const absolute = [];
  for (const offset of positions ?? []) {
    const relativeString = Number(offset?.string);
    const relativeFret = Number(offset?.fret);
    if (!Number.isInteger(relativeString) || !Number.isFinite(relativeFret)) {
      return [];
    }
    const stringIndex = anchorString + relativeString;
    const fret = Math.round(anchorFret + relativeFret);
    if (
      stringIndex < 0 ||
      stringIndex >= getStringCount() ||
      fret < getVisibleMinimumFret() ||
      fret > state.fretCount ||
      !isBoardFretVisible(fret)
    ) {
      return [];
    }
    absolute.push({
      stringIndex,
      fret,
      interval: mod12(offset?.interval ?? 0),
    });
  }
  return absolute;
}

function chooseClosestVisibleEquivalentFret(baseOffset, preferredFret, minFret, maxFret) {
  const normalizedBase = mod12(Number(baseOffset) || 0);
  const preferred = Number(preferredFret) || 0;
  let bestCandidate = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let octave = -6; octave <= 12; octave += 1) {
    const candidate = normalizedBase + octave * 12;
    if (candidate < minFret || candidate > maxFret) {
      continue;
    }
    const score = Math.abs(candidate - preferred) * 10 + candidate;
    if (score < bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }
  return Number.isFinite(bestCandidate) ? bestCandidate : null;
}

function calculateCustomStrictOverlayPlacement(sourcePositions, tuning, anchorString, anchorFret) {
  if (!Array.isArray(tuning) || !tuning.length) {
    return [];
  }
  const absolute = [];
  const minFret = getVisibleMinimumFret();
  const maxFret = state.fretCount;

  for (const pos of sourcePositions ?? []) {
    const relativeString = Number(pos?.string);
    const relativeFret = Number(pos?.fret);
    const sourceNoteIndex = Number.isFinite(pos?.sourceNoteIndex) ? mod12(Number(pos.sourceNoteIndex)) : null;
    if (!Number.isInteger(relativeString) || !Number.isFinite(relativeFret) || !Number.isFinite(sourceNoteIndex)) {
      return [];
    }
    const stringIndex = anchorString + relativeString;
    if (stringIndex < 0 || stringIndex >= tuning.length) {
      return [];
    }
    const openNoteIndex = getNoteIndex(tuning[stringIndex]);
    if (!Number.isFinite(openNoteIndex)) {
      return [];
    }
    const preferredFret = Math.round(anchorFret + relativeFret);
    const fret = chooseClosestVisibleEquivalentFret(sourceNoteIndex - openNoteIndex, preferredFret, minFret, maxFret);
    if (!Number.isFinite(fret) || !isBoardFretVisible(fret)) {
      return [];
    }
    absolute.push({
      stringIndex,
      fret,
      interval: mod12(pos?.interval ?? 0),
    });
  }

  return absolute;
}

function getShapeById(shapeId) {
  if (!shapeId) {
    return null;
  }
  return getActiveShapes().find((entry) => entry.id === shapeId) ?? null;
}

function getOverlayShape(shapeId) {
  return getShapeById(shapeId);
}

function getScaleDegreeMapForShape(shape) {
  if (!shape) {
    return null;
  }
  const id = `${shape.id ?? ""}`.toLowerCase();
  const name = `${shape.name ?? ""}`.toLowerCase();
  const mode = `${shape.mode ?? ""}`.toLowerCase();
  const system = `${shape.system ?? ""}`.toLowerCase();

  const melodicMatch = id.match(/^melodic_minor_3nps_shape_(\d+)$/);
  if (melodicMatch) {
    const index = Number(melodicMatch[1]) - 1;
    return MELODIC_MINOR_MODE_DEGREE_MAPS[index] ?? null;
  }

  const harmonicMatch = id.match(/^harmonic_minor_3nps_shape_(\d+)$/);
  if (harmonicMatch) {
    const index = Number(harmonicMatch[1]) - 1;
    return HARMONIC_MINOR_MODE_DEGREE_MAPS[index] ?? null;
  }

  if (system.includes("diminished scale")) {
    if (name.includes("s-t")) {
      return DIMINISHED_ST_DEGREE_MAP;
    }
    if (name.includes("t-s")) {
      return DIMINISHED_TS_DEGREE_MAP;
    }
  }

  if (system.includes("whole tone")) {
    return WHOLE_TONE_DEGREE_MAP;
  }

  if (system.includes("blues scale")) {
    return BLUES_SCALE_DEGREE_MAP;
  }

  if (system.includes("pentatonic")) {
    if (mode.includes("minor pentatonic")) {
      return MINOR_PENTATONIC_DEGREE_MAP;
    }
    if (mode.includes("major pentatonic")) {
      return MAJOR_PENTATONIC_DEGREE_MAP;
    }
  }

  if (mode.includes("lydian")) return LYDIAN_DEGREE_MAP;
  if (mode.includes("mixolydian")) return MIXOLYDIAN_DEGREE_MAP;
  if (mode.includes("phrygian")) return PHRYGIAN_DEGREE_MAP;
  if (mode.includes("dorian")) return DORIAN_DEGREE_MAP;
  if (mode.includes("locrian")) return LOCRIAN_DEGREE_MAP;
  if (mode.includes("melodic minor")) return MELODIC_MINOR_DEGREE_MAP;
  if (mode.includes("harmonic minor")) return HARMONIC_MINOR_DEGREE_MAP;
  if (mode.includes("aeolian") || mode.includes("natural minor")) return NATURAL_MINOR_DEGREE_MAP;
  if (
    mode.includes("ionian") ||
    mode.includes("major scale") ||
    system.includes("caged-major-scales")
  ) {
    return MAJOR_SCALE_DEGREE_MAP;
  }
  return null;
}

function getChordDegreeMapForShape(shape) {
  if (!shape) {
    return null;
  }
  const system = `${shape.system ?? ""}`.toLowerCase();
  const mode = `${shape.mode ?? ""}`.toLowerCase();

  if (system.includes("caged chord")) {
    return { 0: "R", 4: "3", 7: "5" };
  }
  if (system.includes("diminished 7 chord")) {
    return { 0: "R", 3: "b3", 6: "b5", 9: "bb7" };
  }
  if (system.includes("triad")) {
    if (mode.includes("sus2")) return { 0: "R", 2: "2", 7: "5" };
    if (mode.includes("sus4")) return { 0: "R", 5: "4", 7: "5" };
    if (mode.includes("diminished")) return { 0: "R", 3: "b3", 6: "b5" };
    if (mode.includes("augmented")) return { 0: "R", 4: "3", 8: "#5" };
    if (mode.includes("minor")) return { 0: "R", 3: "b3", 7: "5" };
    return { 0: "R", 4: "3", 7: "5" };
  }
  if (system.includes("drop 2") || system.includes("drop 3")) {
    if (mode.includes("sus2")) return { 0: "R", 2: "2", 7: "5", 10: "b7" };
    if (mode.includes("sus4")) return { 0: "R", 5: "4", 7: "5", 10: "b7" };
    if (mode.includes("half-diminished")) return { 0: "R", 3: "b3", 6: "b5", 10: "b7" };
    if (mode.includes("diminished 7")) return { 0: "R", 3: "b3", 6: "b5", 9: "bb7" };
    if (mode.includes("dominant 7")) return { 0: "R", 4: "3", 7: "5", 10: "b7" };
    if (mode.includes("minor 7")) return { 0: "R", 3: "b3", 7: "5", 10: "b7" };
    if (mode.includes("major 7")) return { 0: "R", 4: "3", 7: "5", 11: "7" };
    return { 0: "R", 4: "3", 7: "5" };
  }
  if (system.includes("shell voicing")) {
    if (mode.includes("half-diminished")) return { 0: "R", 3: "b3", 6: "b5", 10: "b7" };
    if (mode.includes("diminished 7")) return { 0: "R", 3: "b3", 6: "b5", 9: "bb7" };
    if (mode.includes("dominant 7")) return { 0: "R", 4: "3", 10: "b7" };
    if (mode.includes("minor 7")) return { 0: "R", 3: "b3", 10: "b7" };
    if (mode.includes("major 7")) return { 0: "R", 4: "3", 11: "7" };
    if (mode.includes("diminished")) return { 0: "R", 3: "b3", 6: "b5" };
    if (mode.includes("augmented")) return { 0: "R", 4: "3", 8: "#5" };
    if (mode.includes("minor")) return { 0: "R", 3: "b3", 7: "5" };
    return { 0: "R", 4: "3", 7: "5" };
  }
  if (system.includes("arpeggio")) {
    if (mode.includes("half-diminished")) return { 0: "R", 3: "b3", 6: "b5", 10: "b7" };
    if (mode.includes("dominant 7")) return { 0: "R", 4: "3", 7: "5", 10: "b7" };
    if (mode.includes("minor 7")) return { 0: "R", 3: "b3", 7: "5", 10: "b7" };
    if (mode.includes("major 7")) return { 0: "R", 4: "3", 7: "5", 11: "7" };
    return { 0: "R", 4: "3", 7: "5" };
  }

  return null;
}

function getOverlayDegreeMap(shape) {
  return getChordDegreeMapForShape(shape) ?? getScaleDegreeMapForShape(shape);
}

function getDegreeCaption(degreeToken, shape) {
  if (!degreeToken) {
    return "";
  }
  const isChord =
    `${shape?.system ?? ""}`.toLowerCase().includes("chord") ||
    `${shape?.system ?? ""}`.toLowerCase().includes("drop ") ||
    `${shape?.system ?? ""}`.toLowerCase().includes("triad") ||
    `${shape?.system ?? ""}`.toLowerCase().includes("shell voicing");
  if (isChord) {
    return degreeToken;
  }
  return DEGREE_LABEL_ALIAS[degreeToken] ?? degreeToken;
}

function getOverlayPositionNoteName(stringIndex, fret) {
  return getOverlayPreferredNoteName(getPositionNoteIndex(stringIndex, fret, getActiveTuning()));
}

function resolveOverlayRootNoteName(shape, anchorString, anchorFret, positions = []) {
  const rootCandidates = (positions ?? [])
    .filter(
      (entry) =>
        entry &&
        Number.isInteger(entry.stringIndex) &&
        Number.isFinite(entry.fret) &&
        entry.fret >= 0 &&
        mod12(entry.interval ?? -1) === 0
    )
    .sort((a, b) => {
      const aDistance = Math.abs(a.stringIndex - anchorString) + Math.abs(a.fret - anchorFret);
      const bDistance = Math.abs(b.stringIndex - anchorString) + Math.abs(b.fret - anchorFret);
      return aDistance - bDistance || a.stringIndex - b.stringIndex || a.fret - b.fret;
    });

  if (rootCandidates.length) {
    const root = rootCandidates[0];
    return getOverlayPositionNoteName(root.stringIndex, root.fret);
  }

  const absoluteRootString = Number(anchorString);
  const absoluteRootFret = Number(anchorFret);
  if (
    Number.isInteger(absoluteRootString) &&
    absoluteRootString >= 0 &&
    absoluteRootString < getStringCount() &&
    Number.isFinite(absoluteRootFret) &&
    absoluteRootFret >= 0
  ) {
    return getOverlayPositionNoteName(absoluteRootString, absoluteRootFret);
  }

  return null;
}

function getOverlayToneLabel(shape, anchorString, anchorFret, pos, rootNoteName = null) {
  const degreeMap = getOverlayDegreeMap(shape);
  const degreeToken = degreeMap?.[mod12(pos.interval)] ?? `${mod12(pos.interval)}`;
  const fallbackNoteName = getDisplayLabelForNoteIndex(
    getPositionNoteIndex(pos.stringIndex, pos.fret, getActiveTuning())
  );
  if (isMovableDoEnabled()) {
    return {
      noteName: fallbackNoteName,
      degreeLabel: "",
      degreeToken,
    };
  }
  const prefersAbsoluteNoteName = getActiveInstrument()?.id === CUSTOM_INSTRUMENT_ID;
  const spelledByDegree =
    !prefersAbsoluteNoteName && rootNoteName && degreeMap
      ? spellNoteFromRootAndDegree(rootNoteName, degreeToken === "R" ? "1" : degreeToken)
      : null;
  const noteName = spelledByDegree ?? fallbackNoteName;
  return {
    noteName,
    degreeLabel: getDegreeCaption(degreeToken, shape),
    degreeToken,
  };
}

function appendOverlayDot(
  group,
  { pos, shape, anchorString, anchorFret, rootNoteName = null, preview = false, overlayId = null }
) {
  const centerX = getMarkerCenterX(pos.fret);
  const centerY = getStringY(pos.stringIndex);
  const isRoot = pos.interval === 0;
  const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  dot.setAttribute(
    "class",
    `${isRoot ? "overlay-dot overlay-root" : "overlay-dot"}${preview ? " overlay-preview-dot" : ""}`
  );
  dot.setAttribute("cx", centerX);
  dot.setAttribute("cy", centerY);
  dot.setAttribute("r", `${isRoot ? OVERLAY_ROOT_DOT_RADIUS : OVERLAY_DOT_RADIUS}`);
  if (!preview && overlayId) {
    dot.dataset.overlayId = overlayId;
    dot.dataset.string = `${pos.stringIndex}`;
    dot.dataset.fret = `${pos.fret}`;
  }
  group.appendChild(dot);

  const labels = getOverlayToneLabel(shape, anchorString, anchorFret, pos, rootNoteName);
  const noteText = document.createElementNS("http://www.w3.org/2000/svg", "text");
  noteText.setAttribute(
    "class",
    `overlay-note-text${preview ? " overlay-note-text--preview" : ""}${isRoot ? " overlay-note-text--root" : ""}${isMovableDoEnabled() ? " numeric-label" : ""}`
  );
  noteText.setAttribute("x", `${centerX}`);
  noteText.setAttribute("y", `${centerY + 1}`);
  const noteTransform = getSvgTextTransformValue(centerX, centerY + 1);
  if (noteTransform) {
    noteText.setAttribute("transform", noteTransform);
  }
  noteText.textContent = labels.noteName;
  group.appendChild(noteText);
}

function renderOverlays() {
  const svgs = getFretboardSvgs();
  if (!svgs.length) {
    return;
  }
  svgs.forEach((svg) => {
    svg.querySelectorAll(".overlay-group, .overlay-preview-group").forEach((node) => node.remove());
  });
  overlays.forEach((overlay) => {
    if (!overlay.visible) {
      return;
    }
    const shape = getOverlayShape(overlay.shapeId);
    const rootNoteName = resolveOverlayRootNoteName(shape, overlay.anchorString, overlay.anchorFret, overlay.positions);
    svgs.forEach((svg) => {
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.classList.add("overlay-group");
      overlay.positions.filter((pos) => isBoardFretVisible(pos?.fret)).forEach((pos) => {
        appendOverlayDot(group, {
          pos,
          shape,
          anchorString: overlay.anchorString,
          anchorFret: overlay.anchorFret,
          rootNoteName,
          overlayId: overlay.id,
        });
      });
      getBoardContentLayer(svg)?.appendChild(group);
    });
  });

  if (!dragOverlayPreview?.positions?.length) {
    return;
  }
  const previewShape = getOverlayShape(dragOverlayPreview.shapeId);
  const previewRootNoteName = resolveOverlayRootNoteName(
    previewShape,
    dragOverlayPreview.anchorString,
    dragOverlayPreview.anchorFret,
    dragOverlayPreview.positions
  );
  svgs.forEach((svg) => {
    const previewGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    previewGroup.classList.add("overlay-preview-group");
    dragOverlayPreview.positions.filter((pos) => isBoardFretVisible(pos?.fret)).forEach((pos) => {
      appendOverlayDot(previewGroup, {
        pos,
        shape: previewShape,
        anchorString: dragOverlayPreview.anchorString,
        anchorFret: dragOverlayPreview.anchorFret,
        rootNoteName: previewRootNoteName,
        preview: true,
      });
    });
    getBoardContentLayer(svg)?.appendChild(previewGroup);
  });
}

function isValidRealtimePosition(stringIndex, fret) {
  return (
    Number.isInteger(stringIndex) &&
    Number.isInteger(fret) &&
    stringIndex >= 0 &&
    stringIndex < getStringCount() &&
    fret >= 0 &&
    fret <= state.fretCount
  );
}

function isValidRealtimeStringIndex(stringIndex) {
  return Number.isInteger(stringIndex) && stringIndex >= 0 && stringIndex < getStringCount();
}

function getRealtimeEventKey(payload = {}, source = "live") {
  const eventId = payload.eventId ?? payload.id ?? null;
  if (eventId) {
    return `${source}:${eventId}`;
  }
  const midiNote = Number(payload.midiNote);
  const channel = Number(payload.channel || 0);
  return `${source}:midi:${Number.isFinite(midiNote) ? midiNote : "na"}:ch:${channel}`;
}

function getPreferredPositionFromChannel(channel) {
  const normalizedChannel = Number(channel);
  if (!Number.isFinite(normalizedChannel)) {
    return null;
  }
  const stringIndex = normalizedChannel - 1;
  if (stringIndex < 0 || stringIndex >= getStringCount()) {
    return null;
  }
  return { stringIndex };
}

function resolveRealtimePosition(payload = {}) {
  const rawStringIndex = Number(payload.stringIndex);
  const rawFret = Number(payload.fret);
  const midiNote = Number(payload.midiNote);

  const hasExplicitString = Number.isFinite(rawStringIndex);
  const hasExplicitFret = Number.isFinite(rawFret);
  if (hasExplicitString || hasExplicitFret) {
    const explicitString = Math.round(rawStringIndex);
    const explicitFret = Math.round(rawFret);
    if (
      hasExplicitString &&
      hasExplicitFret &&
      isValidRealtimeStringIndex(explicitString) &&
      explicitFret >= 0
    ) {
      return {
        stringIndex: explicitString,
        fret: explicitFret,
        midiNote: Number.isFinite(midiNote) ? midiNote : null,
      };
    }
    return null;
  }

  if (!Number.isFinite(midiNote)) {
    return null;
  }

  const midiHistoryKey = `${midiNote}:ch:${Number(payload.channel || 0)}`;
  const previousPosition = realtime.lastMidiPositions.get(midiHistoryKey) ?? null;
  const preferredPosition = getPreferredPositionFromChannel(payload.channel) ?? previousPosition;
  const positions = getTabPositionsFromMidi(midiNote, state.fretCount, getActiveOpenMidi()).filter((position) =>
    isBoardFretVisible(position?.fret)
  );
  const best = pickBestTabPosition(positions, {
    preferredPosition,
    previousFret: previousPosition?.fret,
  });

  if (!best || !isValidRealtimePosition(best.stringIndex, best.fret)) {
    return null;
  }

  realtime.lastMidiPositions.set(midiHistoryKey, best);
  return {
    stringIndex: best.stringIndex,
    fret: best.fret,
    midiNote,
  };
}

function shouldUseRealtimeChordMapper(source) {
  const normalized = `${source ?? ""}`.trim().toLowerCase();
  return normalized === "daw-midi" || normalized === "live";
}

function getRealtimeVoiceChordEntries(source, channel) {
  const targetChannel = Number(channel || 0);
  return Array.from(realtime.markers.entries())
    .filter(([, marker]) => marker?.source === source && Number(marker?.channel || 0) === targetChannel)
    .map(([eventKey, marker]) => ({
      eventKey,
      midiNote: Number(marker?.midiNote),
      stringIndex: Number(marker?.stringIndex),
      fret: Number(marker?.fret),
    }))
    .filter(
      (entry) =>
        Number.isFinite(entry.midiNote) &&
        Number.isInteger(entry.stringIndex) &&
        Number.isInteger(entry.fret) &&
        entry.fret >= 0
    );
}

function buildMidiMultisetKey(values = []) {
  return [...values]
    .map((value) => Math.round(Number(value)))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b)
    .join("|");
}

function getShapePlacementVariants(shape) {
  if (Array.isArray(shape?.dragPlacementVariantList) && shape.dragPlacementVariantList.length) {
    return shape.dragPlacementVariantList
      .map((variant, index) => ({
        variantId: variant?.variantId ?? `drag-${index}`,
        positions: Array.isArray(variant?.positions) ? variant.positions : [],
      }))
      .filter((entry) => entry.positions.length);
  }
  if (shape?.dragPlacementVariants && typeof shape.dragPlacementVariants === "object") {
    return Object.entries(shape.dragPlacementVariants)
      .map(([variantId, variant]) => ({
        variantId,
        positions: Array.isArray(variant?.positions) ? variant.positions : [],
      }))
      .filter((entry) => entry.positions.length);
  }
  if (Array.isArray(shape?.drop2VariantList) && shape.drop2VariantList.length) {
    return shape.drop2VariantList
      .map((variant, index) => ({
        variantId: variant?.variantId ?? `drop2-${index}`,
        positions: Array.isArray(variant?.positions) ? variant.positions : [],
      }))
      .filter((entry) => entry.positions.length);
  }
  if (Array.isArray(shape?.positions) && shape.positions.length) {
    return [
      {
        variantId: "base",
        positions: shape.positions,
      },
    ];
  }
  return [];
}

function calculateAbsolutePositionsForVariant(variantPositions, anchorString, anchorFret) {
  const absolute = [];
  for (const pos of variantPositions ?? []) {
    const relativeString = Number(pos?.string);
    const relativeFret = Number(pos?.fret);
    if (!Number.isInteger(relativeString) || !Number.isFinite(relativeFret)) {
      return [];
    }
    const stringIndex = anchorString + relativeString;
    const fret = Math.round(anchorFret + relativeFret);
    if (!isValidRealtimePosition(stringIndex, fret)) {
      return [];
    }
    absolute.push({
      stringIndex,
      fret,
      interval: mod12(pos?.interval ?? 0),
    });
  }
  return absolute;
}

function scoreChordLayout(noteEntries, assignments) {
  const assigned = noteEntries
    .map((entry) => ({
      entry,
      position: assignments.get(entry.eventKey) ?? null,
    }))
    .filter((entry) => entry.position);
  if (!assigned.length) {
    return Number.POSITIVE_INFINITY;
  }

  const frets = assigned.map(({ position }) => position.fret);
  const minFret = Math.min(...frets);
  const maxFret = Math.max(...frets);
  const avgFret = frets.reduce((sum, value) => sum + value, 0) / frets.length;
  let score = (maxFret - minFret) * 2.1 + avgFret * 0.32;

  assigned.forEach(({ entry, position }) => {
    score += Math.abs(position.fret - entry.fret) * 0.35;
    score += Math.abs(position.stringIndex - entry.stringIndex) * 0.95;
  });

  const byPitch = [...assigned].sort((a, b) => a.entry.midiNote - b.entry.midiNote || a.position.fret - b.position.fret);
  for (let index = 1; index < byPitch.length; index += 1) {
    const previous = byPitch[index - 1].position.stringIndex;
    const current = byPitch[index].position.stringIndex;
    if (current < previous) {
      score += 3.2;
    }
  }

  return score;
}

function buildExactMidiAssignments(noteEntries, absolutePositions) {
  const openMidi = getActiveOpenMidi();
  const positionsByMidi = new Map();

  absolutePositions.forEach((position) => {
    const open = openMidi[position.stringIndex];
    if (!Number.isFinite(open)) {
      return;
    }
    const midi = Math.round(open + position.fret);
    if (!positionsByMidi.has(midi)) {
      positionsByMidi.set(midi, []);
    }
    positionsByMidi.get(midi).push(position);
  });

  const orderedEntries = [...noteEntries]
    .map((entry) => ({
      ...entry,
      candidates: positionsByMidi.get(Math.round(entry.midiNote)) ?? [],
    }))
    .sort(
      (a, b) =>
        a.candidates.length - b.candidates.length ||
        Math.abs(a.fret) - Math.abs(b.fret) ||
        a.midiNote - b.midiNote
    );

  if (orderedEntries.some((entry) => !entry.candidates.length)) {
    return null;
  }

  const usedByString = new Set();
  const current = new Map();
  let best = null;
  let bestScore = Number.POSITIVE_INFINITY;

  function dfs(depth) {
    if (depth >= orderedEntries.length) {
      const score = scoreChordLayout(noteEntries, current);
      if (score < bestScore) {
        bestScore = score;
        best = new Map(current);
      }
      return;
    }

    const entry = orderedEntries[depth];
    const ranked = [...entry.candidates].sort((a, b) => {
      const aMove = Math.abs(a.fret - entry.fret) + Math.abs(a.stringIndex - entry.stringIndex) * 1.2;
      const bMove = Math.abs(b.fret - entry.fret) + Math.abs(b.stringIndex - entry.stringIndex) * 1.2;
      return aMove - bMove || a.fret - b.fret || a.stringIndex - b.stringIndex;
    });

    for (const candidate of ranked) {
      if (usedByString.has(candidate.stringIndex)) {
        continue;
      }
      usedByString.add(candidate.stringIndex);
      current.set(entry.eventKey, candidate);
      dfs(depth + 1);
      current.delete(entry.eventKey);
      usedByString.delete(candidate.stringIndex);
    }
  }

  dfs(0);
  return best;
}

function findDropVoicingPresetAssignments(noteEntries) {
  if (!Array.isArray(noteEntries) || noteEntries.length !== 4) {
    return null;
  }

  const dropShapes = getActiveShapes().filter((shape) => isDrop2Shape(shape) || isDrop3Shape(shape));
  if (!dropShapes.length) {
    return null;
  }

  const targetKey = buildMidiMultisetKey(noteEntries.map((entry) => entry.midiNote));
  const testedAnchors = new Set();
  let bestAssignments = null;
  let bestScore = Number.POSITIVE_INFINITY;

  dropShapes.forEach((shape) => {
    const variants = getShapePlacementVariants(shape);
    variants.forEach((variant) => {
      const rootPositions = (variant.positions ?? []).filter((position) => mod12(position?.interval ?? -1) === 0);
      if (!rootPositions.length) {
        return;
      }
      noteEntries.forEach((noteEntry) => {
        const rootTabs = getTabPositionsFromMidi(noteEntry.midiNote, state.fretCount, getActiveOpenMidi());
        rootTabs.forEach((rootTab) => {
          rootPositions.forEach((rootPos) => {
            const anchorString = rootTab.stringIndex - Number(rootPos.string);
            const anchorFret = rootTab.fret - Number(rootPos.fret);
            if (!Number.isInteger(anchorString) || !Number.isFinite(anchorFret)) {
              return;
            }
            const anchorKey = `${shape.id}:${variant.variantId}:${anchorString}:${anchorFret}`;
            if (testedAnchors.has(anchorKey)) {
              return;
            }
            testedAnchors.add(anchorKey);

            const absolute = calculateAbsolutePositionsForVariant(variant.positions, anchorString, anchorFret);
            if (absolute.length !== noteEntries.length) {
              return;
            }
            const midiKey = buildMidiMultisetKey(
              absolute.map((position) => getActiveOpenMidi()[position.stringIndex] + position.fret)
            );
            if (midiKey !== targetKey) {
              return;
            }
            const assignments = buildExactMidiAssignments(noteEntries, absolute);
            if (!assignments) {
              return;
            }
            const score = scoreChordLayout(noteEntries, assignments);
            if (score < bestScore) {
              bestScore = score;
              bestAssignments = assignments;
            }
          });
        });
      });
    });
  });

  return bestAssignments;
}

function solveUniqueStringAssignments(noteEntries) {
  const openMidi = getActiveOpenMidi();
  const entries = noteEntries
    .map((entry) => ({
      ...entry,
      candidates: getTabPositionsFromMidi(entry.midiNote, state.fretCount, openMidi),
    }))
    .filter((entry) => entry.candidates.length);

  if (entries.length !== noteEntries.length) {
    return null;
  }

  const ordered = [...entries].sort(
    (a, b) => a.candidates.length - b.candidates.length || a.midiNote - b.midiNote || a.fret - b.fret
  );
  const usedStrings = new Set();
  const current = new Map();
  let best = null;
  let bestScore = Number.POSITIVE_INFINITY;

  function dfs(depth) {
    if (depth >= ordered.length) {
      const score = scoreChordLayout(noteEntries, current);
      if (score < bestScore) {
        bestScore = score;
        best = new Map(current);
      }
      return;
    }

    const entry = ordered[depth];
    const rankedCandidates = [...entry.candidates].sort((a, b) => {
      const aMove = Math.abs(a.fret - entry.fret) + Math.abs(a.stringIndex - entry.stringIndex) * 1.2;
      const bMove = Math.abs(b.fret - entry.fret) + Math.abs(b.stringIndex - entry.stringIndex) * 1.2;
      return aMove - bMove || a.fret - b.fret || a.stringIndex - b.stringIndex;
    });

    for (const candidate of rankedCandidates) {
      if (usedStrings.has(candidate.stringIndex)) {
        continue;
      }
      usedStrings.add(candidate.stringIndex);
      current.set(entry.eventKey, candidate);
      dfs(depth + 1);
      current.delete(entry.eventKey);
      usedStrings.delete(candidate.stringIndex);
    }
  }

  dfs(0);
  return best;
}

function updateRealtimeMidiHistoryFromAssignments(noteEntries, assignments, channel) {
  const normalizedChannel = Number(channel || 0);
  noteEntries.forEach((entry) => {
    const assigned = assignments.get(entry.eventKey);
    if (!assigned) {
      return;
    }
    const midiHistoryKey = `${Math.round(entry.midiNote)}:ch:${normalizedChannel}`;
    realtime.lastMidiPositions.set(midiHistoryKey, {
      stringIndex: assigned.stringIndex,
      fret: assigned.fret,
    });
  });
}

function remapRealtimeVoiceChord(source, channel) {
  if (!shouldUseRealtimeChordMapper(source)) {
    return false;
  }

  const noteEntries = getRealtimeVoiceChordEntries(source, channel);
  if (noteEntries.length <= 1) {
    return false;
  }

  const presetAssignments = findDropVoicingPresetAssignments(noteEntries);
  const assignments = presetAssignments ?? solveUniqueStringAssignments(noteEntries);
  if (!assignments) {
    return false;
  }

  let changed = false;
  assignments.forEach((position, eventKey) => {
    const marker = realtime.markers.get(eventKey);
    if (!marker || !isValidRealtimePosition(position.stringIndex, position.fret)) {
      return;
    }
    if (marker.stringIndex !== position.stringIndex || marker.fret !== position.fret) {
      marker.stringIndex = position.stringIndex;
      marker.fret = position.fret;
      changed = true;
    }
  });
  updateRealtimeMidiHistoryFromAssignments(noteEntries, assignments, channel);
  return changed;
}

function normalizeRealtimeFx(payload = {}) {
  const candidates = [];
  if (Array.isArray(payload.fx)) {
    candidates.push(...payload.fx);
  }
  if (typeof payload.fx === "string") {
    candidates.push(...payload.fx.split(/[,\s|/]+/g));
  }
  if (typeof payload.technique === "string") {
    candidates.push(...payload.technique.split(/[,\s|/]+/g));
  }
  const normalized = new Set();
  candidates.forEach((entry) => {
    const token = `${entry}`.trim().toLowerCase();
    if (!token) {
      return;
    }
    if (token.includes("bend")) {
      normalized.add("bend");
      return;
    }
    if (token.includes("gliss") || token.includes("slide")) {
      normalized.add("gliss");
    }
  });
  return Array.from(normalized);
}

function getVoiceKey(source, payload = {}) {
  return `${source}:ch:${Number(payload.channel || 0)}`;
}

function cleanupRealtimeFxTrails(now = Date.now()) {
  realtime.fxTrails = realtime.fxTrails.filter((trail) => Number.isFinite(trail.until) && trail.until > now);
}

function renderRealtimeMarkers() {
  const svgs = getFretboardSvgs();
  if (!svgs.length) {
    return;
  }

  svgs.forEach((svg) => {
    svg.querySelectorAll(".realtime-marker-group, .realtime-fx-trail-group").forEach((node) => node.remove());
  });

  const now = Date.now();
  cleanupRealtimeFxTrails(now);

  if (!realtime.markers.size && !realtime.fxTrails.length) {
    return;
  }

  svgs.forEach((svg) => {
    if (!realtime.fxTrails.length) {
      return;
    }
    const trailGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    trailGroup.classList.add("realtime-fx-trail-group");
    realtime.fxTrails.forEach((trail) => {
      if (
        !isValidRealtimePosition(trail.fromStringIndex, trail.fromFret) ||
        !isValidRealtimePosition(trail.toStringIndex, trail.toFret) ||
        !isBoardFretVisible(trail.fromFret) ||
        !isBoardFretVisible(trail.toFret)
      ) {
        return;
      }
      const x1 = getMarkerCenterX(trail.fromFret);
      const y1 = getStringY(trail.fromStringIndex);
      const x2 = getMarkerCenterX(trail.toFret);
      const y2 = getStringY(trail.toStringIndex);
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("class", "realtime-slide-trail");
      path.setAttribute("d", `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 - 10} ${x2} ${y2}`);
      trailGroup.appendChild(path);
    });
    getBoardContentLayer(svg)?.appendChild(trailGroup);
  });

  if (!realtime.markers.size) {
    return;
  }

  const markers = Array.from(realtime.markers.values());
  svgs.forEach((svg) => {
    markers.forEach((marker) => {
      if (!isValidRealtimePosition(marker.stringIndex, marker.fret) || !isBoardFretVisible(marker.fret)) {
        return;
      }
      const centerX = getMarkerCenterX(marker.fret);
      const centerY = getStringY(marker.stringIndex);
      const isOnsetFlash = Number.isFinite(marker.flashUntil) && marker.flashUntil > now;
      const isFxFlash = Number.isFinite(marker.fxUntil) && marker.fxUntil > now;
      const fxSet = new Set(Array.isArray(marker.fx) ? marker.fx : []);
      const hasBendFx = fxSet.has("bend");
      const hasGlissFx = fxSet.has("gliss");
      const noteTransform = getSvgTextTransformAttr(centerX, centerY);
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.classList.add("realtime-marker-group");
      group.innerHTML = `
        ${isOnsetFlash ? `<circle class="realtime-onset-ring" cx="${centerX}" cy="${centerY}" r="${REALTIME_ONSET_RING_RADIUS}"></circle>` : ""}
        ${isFxFlash && hasBendFx ? `<path class="realtime-bend-arc" d="M ${centerX + 14} ${centerY + 10} Q ${centerX + 26} ${centerY - 20} ${centerX + 16} ${centerY - 32}"></path>` : ""}
        ${isFxFlash && hasBendFx ? `<path class="realtime-bend-arrow" d="M ${centerX + 16} ${centerY - 32} L ${centerX + 22} ${centerY - 28} L ${centerX + 14} ${centerY - 24}"></path>` : ""}
        ${isFxFlash && hasGlissFx ? `<path class="realtime-gliss-slash" d="M ${centerX - 15} ${centerY + 14} L ${centerX + 15} ${centerY - 14}"></path>` : ""}
        <circle class="realtime-dot${isOnsetFlash ? " realtime-dot--flash" : ""}" cx="${centerX}" cy="${centerY}" r="${REALTIME_DOT_RADIUS}"></circle>
        <circle class="realtime-dot-core${isOnsetFlash ? " realtime-dot-core--flash" : ""}" cx="${centerX}" cy="${centerY}" r="${REALTIME_DOT_CORE_RADIUS}"></circle>
        <text class="realtime-note-text${isMovableDoEnabled() ? " numeric-label" : ""}" x="${centerX}" y="${centerY}"${noteTransform}>${getDisplayLabelForNoteIndex(
          getPositionNoteIndex(marker.stringIndex, marker.fret, getActiveTuning())
        )}</text>
      `;
      getBoardContentLayer(svg)?.appendChild(group);
    });
  });
}

function clearRealtimeMarkers() {
  stopAllRealtimeAudioVoices();
  realtime.markers.clear();
  realtime.fxTrails.length = 0;
  realtime.lastVoicePositions.clear();
  renderRealtimeMarkers();
}

function applyRealtimeNoteOn(payload = {}, source = "live") {
  const position = resolveRealtimePosition(payload);
  if (!position) {
    return;
  }
  if (position.fret > state.fretCount) {
    setFretCount(position.fret);
  }
  if (!isValidRealtimePosition(position.stringIndex, position.fret)) {
    return;
  }
  const now = Date.now();
  const eventKey = getRealtimeEventKey(payload, source);
  const fx = normalizeRealtimeFx(payload);
  const durationMs = Math.max(0, Number(payload.durationMs || 0));
  const hasBendFx = fx.includes("bend");
  const fxFlashDurationMs = fx.length
    ? hasBendFx && durationMs > 0
      ? Math.max(REALTIME_FX_FLASH_MS, durationMs)
      : REALTIME_FX_FLASH_MS
    : REALTIME_ONSET_FLASH_MS;
  const voiceKey = getVoiceKey(source, payload);
  const previousVoicePosition = realtime.lastVoicePositions.get(voiceKey) ?? null;
  const hasGlissFx = fx.includes("gliss");

  if (
    hasGlissFx &&
    previousVoicePosition &&
    isValidRealtimePosition(previousVoicePosition.stringIndex, previousVoicePosition.fret) &&
    (previousVoicePosition.stringIndex !== position.stringIndex || previousVoicePosition.fret !== position.fret)
  ) {
    realtime.fxTrails.push({
      type: "gliss",
      fromStringIndex: previousVoicePosition.stringIndex,
      fromFret: previousVoicePosition.fret,
      toStringIndex: position.stringIndex,
      toFret: position.fret,
      until: now + REALTIME_SLIDE_TRAIL_MS,
    });
  }
  realtime.lastVoicePositions.set(voiceKey, {
    stringIndex: position.stringIndex,
    fret: position.fret,
    at: now,
  });

  realtime.markers.set(eventKey, {
    ...position,
    channel: Number(payload.channel || 0),
    velocity: Number(payload.velocity || 0),
    fx,
    source,
    flashUntil: now + REALTIME_ONSET_FLASH_MS,
    fxUntil: now + fxFlashDurationMs,
  });
  remapRealtimeVoiceChord(source, payload.channel);
  void playRealtimeAudioNote(eventKey, position, payload.velocity);
  renderRealtimeMarkers();
  setTimeout(() => {
    const marker = realtime.markers.get(eventKey);
    const hasTrail = realtime.fxTrails.length > 0;
    if (!marker && !hasTrail) {
      return;
    }
    const ts = Date.now();
    const markerFlashDone =
      !marker ||
      ((Number.isFinite(marker.flashUntil) && marker.flashUntil <= ts) &&
        (Number.isFinite(marker.fxUntil) && marker.fxUntil <= ts));
    if (markerFlashDone || hasTrail) {
      renderRealtimeMarkers();
    }
  }, Math.max(REALTIME_ONSET_FLASH_MS, fxFlashDurationMs, REALTIME_SLIDE_TRAIL_MS) + 36);
}

function applyRealtimeNoteOff(payload = {}, source = "live") {
  const eventKey = getRealtimeEventKey(payload, source);
  stopRealtimeAudioVoice(eventKey);
  if (!realtime.markers.has(eventKey)) {
    return;
  }
  const channel = Number(realtime.markers.get(eventKey)?.channel ?? payload.channel ?? 0);
  realtime.markers.delete(eventKey);
  remapRealtimeVoiceChord(source, channel);
  renderRealtimeMarkers();
}

function handleBridgeEventPayload(payload = {}) {
  if (!payload || typeof payload !== "object") {
    return;
  }
  if (payload.type === "timelineMeta") {
    const incomingFretCount = Number(payload.fretCount);
    if (Number.isFinite(incomingFretCount) && incomingFretCount > 0) {
      setFretCount(incomingFretCount);
    }
    return;
  }
  if (payload.type === "clear") {
    clearRealtimeMarkers();
    return;
  }
  if (payload.type === "noteOn") {
    applyRealtimeNoteOn(payload, payload.source || "bridge");
    return;
  }
  if (payload.type === "noteOff") {
    applyRealtimeNoteOff(payload, payload.source || "bridge");
  }
}

function initBridgeEventStream() {
  if (typeof window.EventSource !== "function") {
    return;
  }
  try {
    const source = new EventSource(BRIDGE_EVENT_STREAM_URL);
    realtime.eventSource = source;
    source.onmessage = (event) => {
      if (!event?.data) {
        return;
      }
      try {
        const payload = JSON.parse(event.data);
        handleBridgeEventPayload(payload);
      } catch {
        // Ignore invalid payloads from local bridge.
      }
    };
    source.onerror = () => {
      // Keep the EventSource open; browser/Electron will auto-retry.
    };
  } catch {
    // Bridge is optional. The app still works without local stream.
  }
}

function handleWebMidiMessage(event) {
  const message = event?.data;
  if (!message || message.length < 3) {
    return;
  }
  const status = Number(message[0]);
  const command = status & 0xf0;
  const channel = (status & 0x0f) + 1;
  const midiNote = Number(message[1]);
  const velocity = Number(message[2]);
  const payload = {
    channel,
    midiNote,
    velocity,
  };

  if (command === 0x90 && velocity > 0) {
    applyRealtimeNoteOn(payload, "daw-midi");
    return;
  }
  if (command === 0x80 || (command === 0x90 && velocity === 0)) {
    applyRealtimeNoteOff(payload, "daw-midi");
  }
}

function syncMidiInputs() {
  const access = realtime.midiAccess;
  if (!access) {
    return;
  }
  const nextIds = new Set();
  for (const input of access.inputs.values()) {
    if (!input?.id) {
      continue;
    }
    nextIds.add(input.id);
    if (!realtime.midiInputs.has(input.id)) {
      input.onmidimessage = handleWebMidiMessage;
      realtime.midiInputs.set(input.id, input);
    }
  }
  for (const [id, input] of realtime.midiInputs.entries()) {
    if (nextIds.has(id)) {
      continue;
    }
    if (input) {
      input.onmidimessage = null;
    }
    realtime.midiInputs.delete(id);
  }
}

async function initWebMidiInput() {
  if (typeof navigator.requestMIDIAccess !== "function") {
    return;
  }
  try {
    const access = await navigator.requestMIDIAccess({ sysex: false });
    realtime.midiAccess = access;
    syncMidiInputs();
    access.onstatechange = () => {
      syncMidiInputs();
    };
  } catch {
    // Ignore denied or unavailable MIDI permissions.
  }
}

function initRealtimeInputs() {
  initBridgeEventStream();
  void initWebMidiInput();
}

function addOverlay(shapeId, anchorString, anchorFret, options = {}) {
  const shape = getShapeById(shapeId);
  if (!shape) {
    return;
  }
  const positions = options.positionsOverride ?? calculateOverlayPositions(shape, anchorString, anchorFret);
  if (!positions.length) {
    return;
  }
  overlays.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `${shapeId}-${Date.now()}`,
    shapeId,
    shapeName: shape.name,
    system: shape.system,
    mode: shape.mode,
    anchorString,
    anchorFret,
    dragStringSetStart: options.dragStringSetStart ?? null,
    positions,
    visible: true,
  });
  renderOverlays();
  renderOverlayList();
}

function renderOverlayList() {
  if (!dom.overlayList) {
    return;
  }
  if (!overlays.length) {
    dom.overlayList.innerHTML = `<p class="empty-state">${escapeHtml(t("overlay.empty"))}</p>`;
    return;
  }
  dom.overlayList.innerHTML = overlays
    .map((overlay) => {
      const displayString = getStringCount() - overlay.anchorString;
      const metaLine = t("overlay.meta", {
        mode: overlay.mode,
        system: overlay.system,
        string: displayString,
        fret: overlay.anchorFret,
      });
      return `
        <div class="overlay-row" data-id="${overlay.id}">
          <div>
            <strong>${overlay.shapeName}</strong><br />
            ${escapeHtml(metaLine)}
          </div>
          <div class="overlay-actions">
            <button data-action="toggle" data-id="${overlay.id}">
              ${escapeHtml(t(overlay.visible ? "overlay.action.hide" : "overlay.action.show"))}
            </button>
            <button data-action="delete" data-id="${overlay.id}">${escapeHtml(t("overlay.action.delete"))}</button>
          </div>
        </div>`;
    })
    .join("");
}

function clearOverlays() {
  overlays.length = 0;
  renderOverlays();
  renderOverlayList();
}

function getOrdinalStringLabel(stringNumber) {
  if (stringNumber === 1) return "1st";
  if (stringNumber === 2) return "2nd";
  if (stringNumber === 3) return "3rd";
  return `${stringNumber}th`;
}

function getSortedMarkers(boardIndex = state.activeBoardIndex) {
  const board = getBoardState(boardIndex);
  return Object.values(board.markers).sort((a, b) => a.stringIndex - b.stringIndex || a.fret - b.fret);
}

function getRecorderRootMarker() {
  if (!recorder.rootMarkerId) {
    return null;
  }
  const board = getBoardState();
  return board.markers[recorder.rootMarkerId] ?? null;
}

function buildRecorderRows(rootMarker) {
  return Array.from({ length: getStringCount() }, (_, stringIndex) =>
    getSortedMarkers()
      .filter((marker) => marker.stringIndex === stringIndex)
      .map((marker) => marker.fret - rootMarker.fret)
      .sort((a, b) => a - b)
  );
}

function buildRecorderPositions(rootMarker) {
  return getSortedMarkers().map((marker) => ({
    string: marker.stringIndex - rootMarker.stringIndex,
    fret: marker.fret - rootMarker.fret,
    interval: mod12(marker.noteIndex - rootMarker.noteIndex),
  }));
}

function analyzeRecorderShape(rows, positions) {
  const warnings = [];
  const duplicateIntervals = new Map();
  positions.forEach((position) => {
    duplicateIntervals.set(position.interval, (duplicateIntervals.get(position.interval) ?? 0) + 1);
  });
  const repeatedIntervalKinds = Array.from(duplicateIntervals.entries()).filter(([, count]) => count > 1);
  if (repeatedIntervalKinds.length) {
    warnings.push(
      `存在重复音级（按音程统计）：${repeatedIntervalKinds
        .map(([interval, count]) => `${interval}×${count}`)
        .join("，")}`
    );
  }

  rows.forEach((row, rowIndex) => {
    for (let i = 0; i + 2 < row.length; i += 1) {
      if (row[i + 1] - row[i] === 2 && row[i + 2] - row[i + 1] === 2) {
        warnings.push(`第 ${getStringCount() - rowIndex} 弦存在连续两个大二度（${row[i]}, ${row[i + 1]}, ${row[i + 2]}）`);
      }
    }
  });

  const emptyStringCount = rows.filter((row) => !row.length).length;
  if (emptyStringCount > 0) {
    warnings.push(`有 ${emptyStringCount} 根弦没有标记（如为和弦型可能正常）`);
  }

  return warnings;
}

function buildRecorderExportText() {
  const markers = getSortedMarkers();
  if (!markers.length) {
    return { error: "请先在指板上标记至少一个音。", warnings: [] };
  }
  const rootMarker = getRecorderRootMarker();
  if (!rootMarker) {
    return { error: t("recorder.error.needRoot"), warnings: [] };
  }

  const rows = buildRecorderRows(rootMarker);
  const positions = buildRecorderPositions(rootMarker);
  const warnings = analyzeRecorderShape(rows, positions);
  const rootStringNumber = getStringCount() - rootMarker.stringIndex;

  const payload = {
    captureNote: {
      collection: dom.recordShapeCollectionInput?.value?.trim() || "",
      name: dom.recordShapeNameInput?.value?.trim() || "未命名指型",
      mode: dom.recordShapeModeInput?.value?.trim() || "",
      system: dom.recordShapeSystemInput?.value?.trim() || "",
    },
    rootAnchor: {
      markerId: rootMarker.id,
      stringIndex: rootMarker.stringIndex,
      stringLabel: getOrdinalStringLabel(rootStringNumber),
      fret: rootMarker.fret,
      note: getMarkerDisplayLabel(rootMarker),
      noteIndex: rootMarker.noteIndex,
    },
    buildShapeDraft: {
      id: "todo_shape_id",
      name: dom.recordShapeNameInput?.value?.trim() || "TODO",
      mode: dom.recordShapeModeInput?.value?.trim() || "TODO",
      system: dom.recordShapeSystemInput?.value?.trim() || "TODO",
      anchorString: rootMarker.stringIndex,
      rows,
      sortOrder: 0,
    },
    positionsPreview: positions,
  };

  return {
    warnings,
    text:
      `// ${t("recorder.output.label")}\n` +
      `${JSON.stringify(payload, null, 2)}`,
  };
}

function renderRecorderPanel() {
  if (!dom.recordShapeStatus) {
    return;
  }

  const markers = getSortedMarkers();
  const rootMarker = getRecorderRootMarker();
  const board = getBoardState();
  const selectedMarker = board.selectedId ? board.markers[board.selectedId] : null;

  const statusBits = [];
  statusBits.push(recorder.active ? t("recorder.status.active") : t("recorder.status.idle"));
  statusBits.push(t("recorder.status.marked", { count: markers.length }));
  if (selectedMarker) {
    statusBits.push(
      t("recorder.status.recent", {
        string: getStringCount() - selectedMarker.stringIndex,
        fret: selectedMarker.fret,
      })
    );
  }
  if (rootMarker) {
    statusBits.push(
      t("recorder.status.root", {
        string: getStringCount() - rootMarker.stringIndex,
        fret: rootMarker.fret,
        note: getMarkerDisplayLabel(rootMarker),
      })
    );
  }
  dom.recordShapeStatus.textContent = statusBits.join(" · ");

  if (dom.recordShapeMarkerList) {
    if (!markers.length) {
      dom.recordShapeMarkerList.innerHTML = `<p class="empty-state">${escapeHtml(
        t("recorder.emptyMarkers")
      )}</p>`;
    } else {
      dom.recordShapeMarkerList.innerHTML = markers
        .map((marker) => {
          const isRoot = recorder.rootMarkerId === marker.id;
          const rootTag = isRoot ? t("recorder.rootTag") : "";
          return `
            <button
              type="button"
              class="recorder-marker-pill ${isRoot ? "is-root" : ""}"
              data-marker-id="${marker.id}"
              title="${escapeHtml(t("recorder.rootAnchor.title"))}"
            >
              ${escapeHtml(
                t("recorder.markerPill", {
                  string: getStringCount() - marker.stringIndex,
                  fret: marker.fret,
                  note: getMarkerDisplayLabel(marker),
                  rootTag,
                })
              )}
            </button>
          `;
        })
        .join("");
    }
  }

  const exportPreview = recorder.output || "";
  if (dom.recordShapeOutput && dom.recordShapeOutput.value !== exportPreview) {
    dom.recordShapeOutput.value = exportPreview;
  }

  let warnings = [];
  if (markers.length && rootMarker) {
    warnings = analyzeRecorderShape(buildRecorderRows(rootMarker), buildRecorderPositions(rootMarker));
  }

  if (dom.recordShapeWarnings) {
    if (!warnings.length) {
      dom.recordShapeWarnings.innerHTML = `<p class="recorder-warning recorder-warning--ok">${escapeHtml(
        t("recorder.warningOk")
      )}</p>`;
    } else {
      dom.recordShapeWarnings.innerHTML = warnings
        .map((warning) => `<p class="recorder-warning">${warning}</p>`)
        .join("");
    }
  }

  if (dom.recordShapeExportBtn) {
    dom.recordShapeExportBtn.disabled = !markers.length;
  }
  if (dom.recordShapeCopyBtn) {
    dom.recordShapeCopyBtn.disabled = !recorder.output;
    if (Date.now() < recorder.copyFeedbackUntil) {
      dom.recordShapeCopyBtn.textContent = t("recorder.copyDone");
    } else {
      dom.recordShapeCopyBtn.textContent = t("recorder.copy");
    }
  }
}

function startShapeRecording() {
  recorder.active = true;
  recorder.rootMarkerId = null;
  recorder.output = "";
  clearMarkers();
  clearOverlays();
  if (dom.recordShapeNameInput && !dom.recordShapeNameInput.value) {
    dom.recordShapeNameInput.value = "";
  }
  renderRecorderPanel();
}

function cancelShapeRecording() {
  recorder.active = false;
  recorder.rootMarkerId = null;
  recorder.output = "";
  renderRecorderPanel();
}

function handleRecorderMarkerListClick(event) {
  const button = event.target.closest("button[data-marker-id]");
  if (!button) {
    return;
  }
  const markerId = button.dataset.markerId;
  const board = getBoardState();
  if (!board.markers[markerId]) {
    return;
  }
  setRecorderRootMarker(state.activeBoardIndex, markerId);
}

function exportRecordedShape() {
  const result = buildRecorderExportText();
  if (result.error) {
    recorder.output = `// ${t("recorder.exportFailHeader")}\n// ${result.error}`;
    renderRecorderPanel();
    return;
  }
  recorder.output = result.text;
  renderRecorderPanel();
}

async function copyRecordedShapeOutput() {
  if (!recorder.output) {
    return;
  }
  try {
    await navigator.clipboard.writeText(recorder.output);
    recorder.copyFeedbackUntil = Date.now() + 1200;
    renderRecorderPanel();
    setTimeout(() => {
      if (Date.now() >= recorder.copyFeedbackUntil) {
        renderRecorderPanel();
      }
    }, 1300);
  } catch {
    recorder.output = `${recorder.output}\n\n// ${t("recorder.copyFailAppend")}`;
    renderRecorderPanel();
  }
}

function handleMarkerPointerDown(event) {
  const boardIndex = getBoardIndexFromEvent(event);
  setActiveBoard(boardIndex);
  if (event.button > 0 && event.pointerType !== "touch") {
    return;
  }
  const svg = event.currentTarget instanceof SVGSVGElement ? event.currentTarget : event.target.closest?.("svg");
  const board = getBoardState(boardIndex);
  const pointerCell = getBoardCellFromEvent(event, boardIndex);
  const markerIdFromCell = pointerCell && board.markers[pointerCell.id] ? pointerCell.id : null;
  const markerIdUnderPointer = markerIdFromCell ?? getMarkerIdFromClientPoint(svg, event.clientX, event.clientY);
  const selectedMarkerId = markerIdUnderPointer && board.selectedIds?.includes(markerIdUnderPointer) ? markerIdUnderPointer : null;
  if (selectedMarkerId && queueSelectedMarkerDrag(event, boardIndex, selectedMarkerId)) {
    event.preventDefault();
    return;
  }
  if (board.selectedIds?.length && markerIdUnderPointer) {
    event.preventDefault();
    return;
  }
  if (markerIdUnderPointer && board.markers[markerIdUnderPointer]) {
    clearPendingSelectedMarkerDrag();
    startLongPress(markerIdUnderPointer, event, boardIndex);
    event.preventDefault();
    return;
  }
  const cell = event.target.closest(".cell");
  if (!cell) {
    cancelLongPress();
    return;
  }
  const stringIndex = Number(cell.dataset.string);
  const fret = Number(cell.dataset.fret);
  const markerId = `${stringIndex}-${fret}`;
  if (!board.markers[markerId]) {
    startMarqueeSelection(event, boardIndex);
    if (event.button <= 0 || event.pointerType === "touch") {
      previewBoardCellAudio(boardIndex, stringIndex, fret);
    }
    cancelLongPress();
    return;
  }
  clearPendingSelectedMarkerDrag();
  startLongPress(markerId, event, boardIndex);
}

function handleBoardContainerPointerDown(event) {
  if (event.button > 0 && event.pointerType !== "touch") {
    return;
  }
  if (!(event.target instanceof Element)) {
    return;
  }
  if (event.target.closest(".board-inline-controls, .board-inline-controls-mobile-slot")) {
    return;
  }
  if (event.target.closest(".fretboard-svg")) {
    return;
  }
  const boardIndex = state.activeBoardIndex;
  const svg = getSvgForBoardIndex(boardIndex);
  if (!(svg instanceof SVGSVGElement)) {
    return;
  }
  setActiveBoard(boardIndex);
  clearPendingSelectedMarkerDrag();
  startMarqueeSelection(event, boardIndex, svg);
}

function handlePointerUp(event) {
  if (finishSelectedMarkerDrag(event)) {
    cancelLongPress();
    event.preventDefault();
    return;
  }
  if (finishMarqueeSelection(event)) {
    event.preventDefault();
  }
  clearPendingSelectedMarkerDrag();
  cancelLongPress();
}

function handleSvgPointerMove(event) {
  if (handleSelectedMarkerDragMove(event)) {
    event.preventDefault();
    return;
  }
  handleMarqueePointerMove(event);
  if (longPressTimer && longPressTargetId) {
    const movedDistance = Math.hypot(event.clientX - longPressPointer.x, event.clientY - longPressPointer.y);
    if (movedDistance > 10) {
      cancelLongPress();
    }
  }
}

function handleWindowBoardPointerMove(event) {
  if (handleSelectedMarkerDragMove(event)) {
    event.preventDefault();
    return;
  }
  handleMarqueePointerMove(event);
}

function handleWindowBoardPointerUp(event) {
  if (finishSelectedMarkerDrag(event)) {
    event.preventDefault();
    return;
  }
  if (finishMarqueeSelection(event)) {
    event.preventDefault();
  }
}

function updateMarkerHint() {
  if (!dom.markerHint) {
    return;
  }
  const board = getBoardState();
  const count = Object.keys(board.markers).length;
  dom.markerHint.innerHTML = t("marker.hint", { count });
}

function runSvgClickAction(key, action) {
  if (pendingSvgClick?.timer) {
    if (pendingSvgClick.key !== key && typeof pendingSvgClick.action === "function") {
      clearTimeout(pendingSvgClick.timer);
      const pendingAction = pendingSvgClick.action;
      pendingSvgClick = null;
      pendingAction();
    } else {
      clearTimeout(pendingSvgClick.timer);
      pendingSvgClick = null;
    }
  }
  pendingSvgClick = {
    key,
    action,
    timer: window.setTimeout(() => {
      pendingSvgClick = null;
      action();
    }, SVG_CLICK_DELAY_MS),
  };
}

function handleSvgClick(event) {
  const boardIndex = getBoardIndexFromEvent(event);
  setActiveBoard(boardIndex);
  if (Date.now() < selectionInteractionSuppressedUntil) {
    return;
  }
  const board = getBoardState(boardIndex);
  const overlayDot = event.target.closest?.(".overlay-dot");
  if (overlayDot?.dataset?.overlayId) {
    const stringIndex = Number(overlayDot.dataset.string);
    const fret = Number(overlayDot.dataset.fret);
    if (!Number.isNaN(stringIndex) && !Number.isNaN(fret)) {
      removeOverlayPosition(overlayDot.dataset.overlayId, stringIndex, fret);
      return;
    }
  }

  const cell = getBoardCellFromEvent(event, boardIndex);
  if (!cell) {
    if (board.selectedIds?.length) {
      clearBoardSelection(boardIndex);
    }
    return;
  }
  const { stringIndex, fret, id } = cell;
  if (board.selectedIds?.length) {
    if (board.selectedIds.includes(id)) {
      return;
    }
    clearBoardSelection(boardIndex);
    return;
  }
  if (
    longPressSuppressedId &&
    longPressSuppressedId.boardIndex === boardIndex &&
    longPressSuppressedId.markerId === id
  ) {
    longPressSuppressedId = null;
    return;
  }
  if ((event.detail ?? 1) > 1) {
    return;
  }
  if (!board.markers[id] && !consumeRecentBoardCellPreview(boardIndex, stringIndex, fret)) {
    previewBoardCellAudio(boardIndex, stringIndex, fret);
  }
  toggleMarker(boardIndex, stringIndex, fret);
}

function handleSvgDoubleClick(event) {
  if (Date.now() < selectionInteractionSuppressedUntil) {
    return;
  }
  clearPendingSvgClick();
  const boardIndex = getBoardIndexFromEvent(event);
  const cell = getBoardCellFromEvent(event, boardIndex);
  if (!cell) {
    return;
  }
  setActiveBoard(boardIndex, { resetRecorder: false });
  const { stringIndex, fret } = cell;
  const markerId = `${stringIndex}-${fret}`;
  const board = getBoardState(boardIndex);
  if (!board.markers[markerId]) {
    ensureMarker(boardIndex, stringIndex, fret);
    updateMarkerHint();
  } else {
    board.selectedId = markerId;
  }
  if (!consumeRecentBoardCellPreview(boardIndex, stringIndex, fret)) {
    previewBoardCellAudio(boardIndex, stringIndex, fret);
  }
  setRecorderRootMarker(boardIndex, markerId);
}

function clearMarkers(boardIndex = state.activeBoardIndex, { recordHistory = true } = {}) {
  const normalizedBoardIndex = normalizeBoardIndex(boardIndex);
  const board = getBoardState(normalizedBoardIndex);
  if (recordHistory && Object.keys(board.markers).length) {
    rememberBoardHistory(normalizedBoardIndex);
  }
  board.markers = {};
  board.selectedId = null;
  board.selectedIds = [];
  if (state.activeBoardIndex === normalizedBoardIndex) {
    recorder.rootMarkerId = null;
    recorder.output = "";
  }
  updateMarkerHint();
  renderMarkers();
  renderRecorderPanel();
}

function bindControls() {
  syncBoardInlineControlsPlacement();
  syncFretboardCount();
  syncFretRangeInputs();

  dom.boardFretboard?.addEventListener("pointerdown", handleBoardContainerPointerDown);

  dom.boardCountInput?.addEventListener("input", (event) => {
    if (!event?.target) {
      return;
    }
    setBoardCount(event.target.value);
  });

  dom.fretStartInput?.addEventListener("input", (event) => {
    if (!event?.target) {
      return;
    }
    setFretStart(event.target.value, { markCustom: true });
  });

  dom.fretEndInput?.addEventListener("input", (event) => {
    if (!event?.target) {
      return;
    }
    setFretCount(event.target.value, { markCustom: true });
  });

  dom.notePreferenceSelect?.addEventListener("change", (event) => {
    state.notePreference = event.target.value;
    refreshDisplayedNoteLabels();
  });

  dom.labelModeSelect?.addEventListener("change", (event) => {
    state.labelMode = normalizeLabelMode(event.target.value);
    try {
      localStorage.setItem(LABEL_MODE_STORAGE_KEY, state.labelMode);
    } catch {
      // ignore storage errors
    }
    refreshDisplayedNoteLabels();
  });

  dom.movableDoRootSelect?.addEventListener("change", (event) => {
    state.movableDoRoot = normalizeMovableDoRoot(event.target.value);
    try {
      localStorage.setItem(MOVABLE_DO_ROOT_STORAGE_KEY, `${state.movableDoRoot}`);
    } catch {
      // ignore storage errors
    }
    refreshDisplayedNoteLabels();
  });

  dom.instrumentSelect?.addEventListener("change", (event) => {
    if (!event?.target) {
      return;
    }
    if (normalizeInstrumentId(event.target.value) === CUSTOM_INSTRUMENT_ID) {
      openCustomInstrumentModal();
      return;
    }
    setInstrument(event.target.value);
  });
  dom.customInstrumentEditBtn?.addEventListener("click", () => {
    openCustomInstrumentModal();
  });
  dom.guitarToneSelect?.addEventListener("change", (event) => {
    if (!event?.target) {
      return;
    }
    setGuitarTone(event.target.value);
  });
  dom.customStringCountInput?.addEventListener("input", (event) => {
    if (!event?.target) {
      return;
    }
    const count = sanitizeCustomStringCount(event.target.value);
    const presetSemitones = getSelectedIntervalPresetSemitones();
    if (presetSemitones !== null) {
      const nextIntervals = Array.from({ length: Math.max(0, count - 1) }, () => presetSemitones);
      const nextTuning = buildTuningFromIntervals(customInstrumentModal.draftTuning[0], nextIntervals);
      customInstrumentModal.draftIntervals = nextIntervals;
      customInstrumentModal.draftTuning = nextTuning;
      if (dom.customStringCountInput) {
        dom.customStringCountInput.value = `${count}`;
      }
      renderCustomIntervalFields();
      renderCustomTuningFields();
        return;
    }
    syncCustomInstrumentModalDraft(count, customInstrumentModal.draftTuning);
  });
  dom.customIntervalPresetSelect?.addEventListener("change", (event) => {
    const value = Number(event?.target?.value);
    if (!Number.isFinite(value)) {
      renderCustomIntervalFields();
      return;
    }
    const count = sanitizeCustomStringCount(customInstrumentModal.draftTuning.length || dom.customStringCountInput?.value);
    const nextIntervals = Array.from({ length: Math.max(0, count - 1) }, () => value);
    const nextTuning = buildTuningFromIntervals(customInstrumentModal.draftTuning[0], nextIntervals);
    customInstrumentModal.draftIntervals = nextIntervals;
    customInstrumentModal.draftTuning = nextTuning;
    renderCustomIntervalFields();
    renderCustomTuningFields();
  });
  dom.customIntervalFields?.addEventListener("change", (event) => {
    const select = event.target.closest("select[data-custom-interval-index]");
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }
    const index = Number(select.dataset.customIntervalIndex);
    const semitones = Number(select.value);
    if (!Number.isInteger(index) || !Number.isFinite(semitones)) {
      return;
    }
    const nextIntervals = [...(customInstrumentModal.draftIntervals || [])];
    nextIntervals[index] = semitones;
    const nextTuning = buildTuningFromIntervals(customInstrumentModal.draftTuning[0], nextIntervals);
    customInstrumentModal.draftIntervals = nextIntervals;
    customInstrumentModal.draftTuning = nextTuning;
    renderCustomIntervalFields();
    renderCustomTuningFields();
  });
  dom.customTuningFields?.addEventListener("input", (event) => {
    const input = event.target.closest("input[data-custom-string-index]");
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    const index = Number(input.dataset.customStringIndex);
    if (!Number.isInteger(index) || index < 0) {
      return;
    }
    const presetSemitones = getSelectedIntervalPresetSemitones();
    if (presetSemitones !== null) {
      if (index > 0) {
        renderCustomTuningFields();
        return;
      }
      customInstrumentModal.draftTuning[0] = input.value;
      const nextTuning = buildTuningFromIntervals(customInstrumentModal.draftTuning[0], customInstrumentModal.draftIntervals);
      customInstrumentModal.draftTuning = nextTuning;
      renderCustomTuningFields();
      return;
    }
    customInstrumentModal.draftTuning[index] = input.value;
    customInstrumentModal.draftIntervals = calculateIntervalsFromTuning(customInstrumentModal.draftTuning);
    renderCustomIntervalFields();
  });
  dom.customInstrumentModalCloseBtn?.addEventListener("click", closeCustomInstrumentModal);
  dom.customInstrumentCancelBtn?.addEventListener("click", closeCustomInstrumentModal);
  dom.customInstrumentModalBackdrop?.addEventListener("click", closeCustomInstrumentModal);
  dom.customInstrumentModal?.addEventListener("click", (event) => {
    if (event.target === dom.customInstrumentModal) {
      closeCustomInstrumentModal();
    }
  });
  dom.customInstrumentSaveBtn?.addEventListener("click", applyCustomInstrumentConfig);

  dom.clearBtn?.addEventListener("click", () => {
    clearMarkers();
    clearOverlays();
  });
  dom.flipBoardBtn?.addEventListener("click", () => {
    state.fretboardOrientation = getNextFretboardOrientation();
    const nextOrientation = Number(state.fretboardOrientation);
    if (!state.hasCustomFretRange) {
      if (nextOrientation === FRETBOARD_ORIENTATION_TOP) {
        if (!setFretRange(DEFAULT_LANDSCAPE_FRET_START, DEFAULT_LANDSCAPE_FRET_START + DEFAULT_TOP_FRET_SPAN - 1)) {
          renderGrid();
          renderMarkers();
          renderOverlays();
        }
        return;
      }
      if (!setFretRange(DEFAULT_LANDSCAPE_FRET_START, DEFAULT_LANDSCAPE_FRET_END)) {
        renderGrid();
        renderMarkers();
        renderOverlays();
      }
      return;
    }
    renderGrid();
    renderMarkers();
    renderOverlays();
  });

  dom.languageSwitch?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-ui-lang]");
    if (!button) {
      return;
    }
    setUiLanguage(button.dataset.uiLang);
  });
  dom.helpToggleBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleHelpModal();
  });

  dom.paletteToggleBtn?.addEventListener("click", () => {
    togglePalette();
  });
  dom.paletteCloseBtn?.addEventListener("click", () => {
    setPaletteOpen(false);
  });
  dom.paletteBackdrop?.addEventListener("click", () => {
    setPaletteOpen(false);
  });
  dom.exportToggleBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleExportMenu();
  });
  dom.exportMenu?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-export-format]");
    if (!button) {
      return;
    }
    setExportMenuOpen(false);
    void handleBoardExport(button.dataset.exportFormat || "png");
  });
  dom.videoRenderBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleVideoModal();
  });
  dom.videoModalCloseBtn?.addEventListener("click", () => {
    if (videoRenderer.busy) {
      return;
    }
    setVideoModalOpen(false);
  });
  dom.videoCancelBtn?.addEventListener("click", () => {
    if (videoRenderer.busy) {
      return;
    }
    setVideoModalOpen(false);
  });
  dom.videoModalBackdrop?.addEventListener("click", () => {
    if (videoRenderer.busy) {
      return;
    }
    setVideoModalOpen(false);
  });
  dom.videoModal?.addEventListener("click", (event) => {
    if (videoRenderer.busy) {
      return;
    }
    if (event.target !== dom.videoModal) {
      return;
    }
    setVideoModalOpen(false);
  });
  dom.videoDropZone?.addEventListener("click", () => {
    if (videoRenderer.busy) {
      return;
    }
    dom.videoUploadInput?.click();
  });
  dom.videoDropZone?.addEventListener("keydown", (event) => {
    if (videoRenderer.busy) {
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    dom.videoUploadInput?.click();
  });
  ["dragenter", "dragover"].forEach((eventName) => {
    dom.videoDropZone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      if (videoRenderer.busy) {
        return;
      }
      dom.videoDropZone?.classList.add("is-dragging");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    dom.videoDropZone?.addEventListener(eventName, () => {
      dom.videoDropZone?.classList.remove("is-dragging");
    });
  });
  dom.videoDropZone?.addEventListener("drop", (event) => {
    event.preventDefault();
    if (videoRenderer.busy) {
      return;
    }
    const file = event.dataTransfer?.files?.[0] || null;
    setVideoSelectedFile(file);
  });
  dom.videoUploadInput?.addEventListener("change", () => {
    const file = dom.videoUploadInput?.files?.[0] || null;
    setVideoSelectedFile(file);
  });
  dom.videoGenerateBtn?.addEventListener("click", () => {
    void handleVideoGenerate();
  });
  dom.helpModalCloseBtn?.addEventListener("click", () => {
    setHelpModalOpen(false);
  });
  dom.helpModalBackdrop?.addEventListener("click", () => {
    setHelpModalOpen(false);
  });
  dom.helpModal?.addEventListener("click", (event) => {
    if (event.target !== dom.helpModal) {
      return;
    }
    setHelpModalOpen(false);
  });
  document.addEventListener("click", (event) => {
    if (!state.exportMenuOpen) {
      return;
    }
    if (!event.target.closest(".export-menu-wrap")) {
      setExportMenuOpen(false);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (!event.defaultPrevented && !isEditableShortcutTarget(event.target)) {
      const hasShortcutModifier = event.metaKey || event.ctrlKey;
      const key = `${event.key ?? ""}`.toLowerCase();
      if (hasShortcutModifier && !event.altKey) {
        if (key === "z") {
          event.preventDefault();
          if (event.shiftKey) {
            redoBoardMutation();
          } else {
            undoBoardMutation();
          }
          return;
        }
        if (key === "y" && event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          redoBoardMutation();
          return;
        }
        if (key === "c") {
          event.preventDefault();
          copyMarkersToLocalClipboard();
          return;
        }
        if (key === "x") {
          event.preventDefault();
          if (copyMarkersToLocalClipboard()) {
            if (getBoardState(state.activeBoardIndex).selectedIds?.length) {
              deleteSelectedMarkers(state.activeBoardIndex);
            } else {
              clearMarkers(state.activeBoardIndex, { recordHistory: true });
            }
          }
          return;
        }
        if (key === "v") {
          event.preventDefault();
          void pasteMarkersFromClipboard();
          return;
        }
      }
    }
    if (event.key === "Escape" && getBoardState(state.activeBoardIndex).selectedIds?.length) {
      clearBoardSelection(state.activeBoardIndex);
      return;
    }
    if (event.key !== "Escape") {
      return;
    }
    if (state.exportMenuOpen) {
      setExportMenuOpen(false);
    }
    if (state.helpModalOpen) {
      setHelpModalOpen(false);
    }
    if (state.videoModalOpen) {
      setVideoModalOpen(false);
    }
    if (state.paletteOpen) {
      setPaletteOpen(false);
    }
    if (state.customInstrumentModalOpen) {
      closeCustomInstrumentModal();
    }
  });

  dom.shapeLibrary?.addEventListener("dragstart", handleShapeDragStart);
  dom.shapeLibrary?.addEventListener("dragend", () => {
    resetTouchShapeDrag({ clearPreview: true });
  });
  dom.shapeLibrary?.addEventListener("pointerdown", handleShapePointerDown);
  window.addEventListener("pointermove", handleShapePointerMove, { passive: false });
  window.addEventListener("pointerup", handleShapePointerUp, { passive: false });
  window.addEventListener("pointercancel", handleShapePointerCancel, { passive: false });
  window.addEventListener("pointermove", handleWindowBoardPointerMove, { passive: false });
  window.addEventListener("pointerup", handleWindowBoardPointerUp, { passive: false });
  window.addEventListener("pointercancel", handleWindowBoardPointerUp, { passive: false });
  window.addEventListener("resize", syncBoardInlineControlsPlacement);
  dom.overlayList?.addEventListener("click", handleOverlayListClick);
  dom.clearOverlaysBtn?.addEventListener("click", clearOverlays);

  dom.recordShapeStartBtn?.addEventListener("click", startShapeRecording);
  dom.recordShapeCancelBtn?.addEventListener("click", cancelShapeRecording);
  dom.recordShapeExportBtn?.addEventListener("click", exportRecordedShape);
  dom.recordShapeCopyBtn?.addEventListener("click", () => {
    void copyRecordedShapeOutput();
  });
  dom.recordShapeMarkerList?.addEventListener("click", handleRecorderMarkerListClick);
  [
    dom.recordShapeNameInput,
    dom.recordShapeModeInput,
    dom.recordShapeSystemInput,
    dom.recordShapeCollectionInput,
  ].forEach((input) => {
    input?.addEventListener("input", () => {
      if (recorder.output) {
        recorder.output = "";
      }
      renderRecorderPanel();
    });
  });

  window.addEventListener("storage", (event) => {
    if (!event.key || !isFretlabLicenseStorageKey(event.key)) {
      return;
    }
    state.isFullAccess = hasFretlabFullAccess();
    refreshAccessUi();
    syncVideoRendererUi();
  });
}

function init() {
  ensureSampleLibraryMidiMap();
  bindRealtimeAudioUnlockGestures();
  state.language = getInitialUiLanguage();
  state.instrumentId = getInitialInstrumentId();
  state.customInstrumentConfig = getInitialCustomInstrumentConfig();
  state.guitarTone = getInitialGuitarTone();
  state.labelMode = getInitialLabelMode();
  state.movableDoRoot = getInitialMovableDoRoot();
  customInstrumentModal.draftTuning = [...state.customInstrumentConfig.tuning];
  customInstrumentModal.draftIntervals = calculateIntervalsFromTuning(customInstrumentModal.draftTuning);
  if (dom.instrumentSelect) {
    dom.instrumentSelect.value = normalizeInstrumentId(state.instrumentId);
  }
  if (dom.guitarToneSelect) {
    dom.guitarToneSelect.value = normalizeGuitarTone(state.guitarTone);
  }
  if (dom.labelModeSelect) {
    dom.labelModeSelect.value = normalizeLabelMode(state.labelMode);
  }
  state.isFullAccess = hasFretlabFullAccess();
  syncFretRangeInputs();
  syncFretboardCount();
  applyTranslations();
  renderGrid();
  renderMarkers();
  updateMarkerHint();
  buildShapeLibrary();
  renderOverlayList();
  renderRecorderPanel();
  setVideoStatus("video.status.idle");
  syncVideoRendererUi();
  bindControls();
  initRealtimeInputs();
  syncInstrumentControls();
  warmupRealtimeAudioForActiveVoice();
  refreshAccessUi();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
