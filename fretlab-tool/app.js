import {
  STANDARD_TUNING,
  getNoteName,
  getPositionNoteIndex,
  spellNoteFromRootAndDegree,
} from "./theory.js";
import { SCALE_SHAPES } from "./shapes.js";
import { getTabPositionsFromMidi, pickBestTabPosition } from "./plugins/shared/realtime-mapping.js";
import {
  hasFretlabFullAccess,
  isFretlabLicenseStorageKey,
} from "./access-control.js";

const state = {
  language: "zh",
  paletteOpen: false,
  exportMenuOpen: false,
  videoModalOpen: false,
  boardCount: 1,
  activeBoardIndex: 0,
  fretCount: 12,
  fretboardFlipped: false,
  notePreference: "sharps",
  boardStates: [{ markers: {}, selectedId: null }],
  isFullAccess: false,
};

const dom = {
  svg: document.getElementById("fretboardSvg"),
  fretboardStack: document.getElementById("fretboardStack"),
  markerHint: document.getElementById("markerCountHint"),
  boardCountInput: document.getElementById("boardCountInput"),
  notePreferenceSelect: document.getElementById("notePreferenceSelect"),
  exportToggleBtn: document.getElementById("exportToggleBtn"),
  exportMenu: document.getElementById("exportMenu"),
  videoRenderBtn: document.getElementById("videoRenderBtn"),
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
  paletteToggleBtn: document.getElementById("paletteToggleBtn"),
  paletteCloseBtn: document.getElementById("paletteCloseBtn"),
  paletteDrawer: document.getElementById("shapePaletteDrawer"),
  paletteBackdrop: document.getElementById("paletteBackdrop"),
  licenseStatusBanner: document.getElementById("licenseStatusBanner"),
  videoModal: document.getElementById("videoRenderModal"),
  videoModalBackdrop: document.getElementById("videoModalBackdrop"),
  videoModalCloseBtn: document.getElementById("videoModalCloseBtn"),
  videoDropZone: document.getElementById("videoDropZone"),
  videoUploadBtn: document.getElementById("videoUploadBtn"),
  videoUploadInput: document.getElementById("videoUploadInput"),
  videoUploadFileName: document.getElementById("videoUploadFileName"),
  videoProgressWrap: document.getElementById("videoProgressWrap"),
  videoProgressBar: document.getElementById("videoProgressBar"),
  videoProgressText: document.getElementById("videoProgressText"),
  videoCancelBtn: document.getElementById("videoCancelBtn"),
  videoGenerateBtn: document.getElementById("videoGenerateBtn"),
  videoRenderStatus: document.getElementById("videoRenderStatus"),
};

const UI_LANGUAGE_STORAGE_KEY = "ic_fretlab_ui_language";
const UI_LANGUAGES = new Set(["zh", "en"]);
const UI_TEXT = {
  zh: {
    "lang.switch.aria": "语言切换",
    "palette.toggle": "Palette",
    "palette.close.aria": "关闭指型库面板",
    "app.title": "吉他指板白板",
    "board.dropHint": "拖拽指形到指板任意位置",
    "controls.title": "指板控制",
    "controls.subhead": "设置指板数量与音名偏好（± 调整品格）",
    "controls.boardCount": "指板数量",
    "controls.fretCount": "品格数量",
    "controls.fretAdjust.aria": "品格增减",
    "controls.fretAdjust.decrease": "减少品格",
    "controls.fretAdjust.increase": "增加品格",
    "controls.notePreference": "音名偏好",
    "controls.notePreference.sharps": "升号优先",
    "controls.notePreference.flats": "降号优先",
    "controls.clearMarkers": "清空标记",
    "controls.flipBoard": "翻转指板",
    "export.format": "导出格式",
    "export.option.png": "PNG",
    "export.option.svg": "SVG",
    "export.option.pdf": "PDF",
    "export.button": "导出",
    "export.error.unavailable": "导出失败：当前指板尚未准备好。",
    "export.error.popup": "导出 PDF 失败：浏览器拦截了弹出窗口，请允许弹窗后重试。",
    "export.error.render": "导出失败：无法渲染当前指板。",
    "video.button": "视频",
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
    "controls.boardCount": "Boards",
    "controls.fretCount": "Frets",
    "controls.fretAdjust.aria": "Fret adjustment",
    "controls.fretAdjust.decrease": "Decrease frets",
    "controls.fretAdjust.increase": "Increase frets",
    "controls.notePreference": "Note labels",
    "controls.notePreference.sharps": "Prefer sharps",
    "controls.notePreference.flats": "Prefer flats",
    "controls.clearMarkers": "Clear markers",
    "controls.flipBoard": "Flip board",
    "export.format": "Export format",
    "export.option.png": "PNG",
    "export.option.svg": "SVG",
    "export.option.pdf": "PDF",
    "export.button": "Export",
    "export.error.unavailable": "Export failed: fretboard is not ready yet.",
    "export.error.popup": "PDF export failed: popup was blocked by the browser.",
    "export.error.render": "Export failed: unable to render the current fretboard.",
    "video.button": "Video",
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
    "footer.tagline": "Cognitive guitar fretboard training tool",
    "footer.copyrightPrefix": "Copyright © 2026. All rights reserved. Igor Chen ·",
    "meta.title": "IC Fretboard Lab",
  },
};

const LIBRARY_CATEGORY_LABELS = {
  zh: {
    caged: "CAGED系统",
    "major-scale": "大调音阶",
    "major-scale-5": "五个大调音阶",
    drop2: "Drop 2 和弦",
    drop3: "Drop 3 和弦",
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
    "drop3-major7": "大七和弦 · 3个转位",
    "drop3-minor7": "小七和弦 · 3个转位",
    "drop3-dominant7": "属七和弦 · 3个转位",
    "drop3-half-diminished7": "半减七和弦（m7b5）· 3个转位",
    "drop3-sus2-7": "7sus2 · 3个转位",
    "drop3-sus4-7": "7sus4 · 3个转位",
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
    "drop3-major7": "Major 7 · 3 Inversions",
    "drop3-minor7": "Minor 7 · 3 Inversions",
    "drop3-dominant7": "Dominant 7 · 3 Inversions",
    "drop3-half-diminished7": "Half-Diminished 7 (m7b5) · 3 Inversions",
    "drop3-sus2-7": "7sus2 · 3 Inversions",
    "drop3-sus4-7": "7sus4 · 3 Inversions",
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

const STRING_COUNT = STANDARD_TUNING.length;
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
const getVisualStringIndex = (stringIndex) => STRING_COUNT - 1 - stringIndex;
const getStringY = (stringIndex) =>
  DIMENSIONS.boardPadding + getVisualStringIndex(stringIndex) * DIMENSIONS.stringSpacing;
const getCellY = (stringIndex) => getStringY(stringIndex) - DIMENSIONS.stringSpacing / 2;
const getTotalBoardWidth = (fretCount = state.fretCount) =>
  DIMENSIONS.openWidth + DIMENSIONS.fretSpacing * Math.max(1, Number(fretCount) || 1);
const getNutX = (fretCount = state.fretCount) =>
  state.fretboardFlipped ? getTotalBoardWidth(fretCount) - DIMENSIONS.openWidth : DIMENSIONS.openWidth;
const getOpenAreaX = (fretCount = state.fretCount) =>
  state.fretboardFlipped ? getTotalBoardWidth(fretCount) - DIMENSIONS.openWidth : 0;
const getFretboardAreaX = (fretCount = state.fretCount) => (state.fretboardFlipped ? 0 : DIMENSIONS.openWidth);
const getFretX = (fret) => {
  if (!state.fretboardFlipped) {
    return DIMENSIONS.openWidth + (fret - 1) * DIMENSIONS.fretSpacing;
  }
  const totalWidth = getTotalBoardWidth();
  return totalWidth - DIMENSIONS.openWidth - fret * DIMENSIONS.fretSpacing;
};
const getMarkerCenterX = (fret) =>
  fret === 0
    ? getOpenAreaX() + DIMENSIONS.openWidth / 2
    : getFretX(fret) + DIMENSIONS.fretSpacing / 2;
const getMarkerDisplayLabel = (marker) =>
  marker.customLabel ?? getNoteName(marker.noteIndex, state.notePreference);
const getOverlayPreferredNoteName = (noteIndex) => OVERLAY_NOTE_NAME_PRIORITY[mod12(noteIndex)] ?? "C";

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

function createFretboardInlays(fretCount, fretWidth) {
  const centerY = (getStringY(2) + getStringY(3)) / 2;
  const dotRadius = Math.min(9.5, DIMENSIONS.stringSpacing * 0.18);
  const lerp = (a, b, t) => a + (b - a) * t;
  const y54Toward5 = lerp(getStringY(2), getStringY(1), 0.62);
  const y23Toward2 = lerp(getStringY(3), getStringY(4), 0.62);
  const inlays = [];

  for (let fret = 1; fret <= fretCount; fret += 1) {
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
          ${buildSketchInlayDot(centerX, y54Toward5, dotRadius * 0.95, 4000 + fret * 41)}
          ${buildSketchInlayDot(centerX, y23Toward2, dotRadius * 0.95, 5000 + fret * 41)}
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
  return languages.some((value) => value.startsWith("zh")) ? "zh" : "en";
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
  document.documentElement.lang = state.language === "zh" ? "zh-Hans" : "en";
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

  syncVideoRendererUi();
  refreshAccessUi();
}

function setPaletteOpen(nextOpen) {
  const isOpen = Boolean(nextOpen);
  state.paletteOpen = isOpen;
  dom.paletteDrawer?.classList.toggle("is-open", isOpen);
  dom.paletteBackdrop?.classList.toggle("is-open", isOpen);
  if (!isOpen) {
    dom.paletteBackdrop?.classList.remove("is-drag-pass-through");
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
  if (dom.videoUploadFileName) {
    dom.videoUploadFileName.textContent = videoRenderer.file?.name || t("video.file.none");
  }
  if (dom.videoGenerateBtn) {
    dom.videoGenerateBtn.disabled = !videoRenderer.file || Boolean(videoRenderer.fileValidationErrorKey) || videoRenderer.busy;
  }
  if (dom.videoUploadBtn) {
    dom.videoUploadBtn.disabled = videoRenderer.busy;
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

const LONG_PRESS_MS = 600;
let longPressTimer = null;
let longPressTargetId = null;
let longPressSuppressedId = null;
let longPressPointer = { x: 0, y: 0 };
let enharmonicMenuState = null;

const overlays = [];
let dragShapeId = null;
let dragOverlayPreview = null;
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
  return { markers: {}, selectedId: null };
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

function getBoardIndexFromSvg(svg) {
  if (!(svg instanceof SVGSVGElement)) {
    return state.activeBoardIndex;
  }
  const value = Number(svg.dataset.boardIndex);
  return normalizeBoardIndex(Number.isNaN(value) ? state.activeBoardIndex : value);
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
  svg.addEventListener("pointerdown", handleMarkerPointerDown);
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
  syncFretboardCount();
  renderGrid();
  renderMarkers();
  updateMarkerHint();
  renderRecorderPanel();
}

function sanitizeFretCount(nextCount) {
  return Math.min(MAX_FRET_COUNT, Math.max(1, Math.round(Number(nextCount) || 1)));
}

function setFretCount(nextCount) {
  const sanitized = sanitizeFretCount(nextCount);
  if (state.fretCount === sanitized) {
    return false;
  }
  state.fretCount = sanitized;
  renderGrid();
  renderMarkers();
  renderOverlays();
  renderRealtimeMarkers();
  return true;
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

function toggleMarker(boardIndex, stringIndex, fret) {
  const board = getBoardState(boardIndex);
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
  } else {
    board.markers[id] = {
      id,
      stringIndex,
      fret,
      noteIndex: getPositionNoteIndex(stringIndex, fret),
      interval: "",
      customLabel: null,
    };
    board.selectedId = id;
  }
  renderMarkers();
  updateMarkerHint();
  renderRecorderPanel();
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
      marker.customLabel = active.dataset.label;
      renderMarkers();
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
  return `<rect class="cell open-cell" data-string="${stringIndex}" data-fret="0" x="${x}" y="${y}" width="${DIMENSIONS.openWidth}" height="${DIMENSIONS.stringSpacing}"></rect>`;
}

function createFretCell(stringIndex, fret) {
  const x = getFretX(fret);
  const y = getCellY(stringIndex);
  return `<rect class="cell fret-cell" data-string="${stringIndex}" data-fret="${fret}" x="${x}" y="${y}" width="${DIMENSIONS.fretSpacing}" height="${DIMENSIONS.stringSpacing}"></rect>`;
}

function renderGrid() {
  const svgs = getFretboardSvgs();
  if (!svgs.length) {
    return;
  }
  const { fretCount } = state;
  const width = DIMENSIONS.fretSpacing;
  const labelOffset = 26;
  const topY = getStringY(STRING_COUNT - 1);
  const bottomY = getStringY(0);
  const boardHeight = Math.max(bottomY - topY, 0);
  const totalWidth = getTotalBoardWidth(fretCount);
  const totalHeight = bottomY + DIMENSIONS.boardPadding + labelOffset;
  const clipId = "fretboardClip";
  const nutX = getNutX(fretCount);
  const openAreaX = getOpenAreaX(fretCount);
  const fretboardAreaX = getFretboardAreaX(fretCount);

  const stringLines = STANDARD_TUNING.map((_, index) => {
    const y = getStringY(index);
    const x1 = fretboardAreaX;
    const x2 = fretboardAreaX + width * fretCount;
    const cx = (x1 + x2) / 2 + sketchJitter(200 + index, 12);
    const cy = y + sketchJitter(400 + index, 3);
    const y1 = y + sketchJitter(600 + index, 1.8);
    const y2 = y + sketchJitter(800 + index, 1.8);
    return `<path class="string-line" d="M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}"></path>`;
  });

  const fretLines = Array.from({ length: fretCount }).map(
    (_, fretIndex) => {
      const x = getFretX(fretIndex + 1);
      const xTop = x + sketchJitter(1000 + fretIndex, 1.2);
      const xBottom = x + sketchJitter(1200 + fretIndex, 1.2);
      const cx = x + sketchJitter(1400 + fretIndex, 4);
      const cy = (topY + bottomY) / 2 + sketchJitter(1600 + fretIndex, 8);
      return `<path class="fret-line" d="M ${xTop} ${topY} Q ${cx} ${cy} ${xBottom} ${bottomY}"></path>`;
    }
  );

  const fretLabels = Array.from({ length: fretCount }).map((_, index) => {
    const fretNumber = index + 1;
    return `<text class="fret-label" x="${getFretX(fretNumber) + width / 2}" y="${
      bottomY + labelOffset - 6
    }">${fretNumber}</text>`;
  });

  const openCells = STANDARD_TUNING.map((_, stringIndex) => createOpenCell(stringIndex));
  const fretCells = STANDARD_TUNING.flatMap((_, stringIndex) =>
    Array.from({ length: fretCount }).map((_, index) => createFretCell(stringIndex, index + 1))
  );
  const fretboardInlays = createFretboardInlays(fretCount, width);

  const openNoteLabels = STANDARD_TUNING.map((_, stringIndex) => {
    const note = getNoteName(getPositionNoteIndex(stringIndex, 0), state.notePreference);
    return `<text class="open-note" x="${getOpenAreaX(fretCount) + DIMENSIONS.openWidth / 2}" y="${
      getStringY(stringIndex) + 5
    }">${note}</text>`;
  });

  const markup = `
    <defs>
      <clipPath id="${clipId}">
        <rect x="0" y="${topY}" width="${totalWidth}" height="${boardHeight}"></rect>
      </clipPath>
    </defs>
    <g clip-path="url(#${clipId})">
      <rect class="open-area" x="${openAreaX}" y="${topY}" width="${DIMENSIONS.openWidth}" height="${boardHeight}"></rect>
      <rect class="fretboard-area" x="${fretboardAreaX}" y="${topY}" width="${width * fretCount}" height="${boardHeight}"></rect>
      ${fretboardInlays}
    </g>
    ${fretLines.join("")}
    <line class="nut-line" x1="${nutX}" y1="${topY}" x2="${nutX}" y2="${bottomY}"></line>
    ${openCells.join("")}
    ${fretCells.join("")}
    ${openNoteLabels.join("")}
    ${fretLabels.join("")}
    ${stringLines.join("")}
  `;
  svgs.forEach((svg) => {
    svg.setAttribute("viewBox", `0 0 ${totalWidth} ${totalHeight}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.innerHTML = markup;
  });
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
    system.includes("arpeggio")
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
  const height = 72;
  const padX = 12;
  const padY = 10;
  const strings = STRING_COUNT;
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
      return `<circle class="shape-thumb__dot${isRoot ? " is-root" : ""}" cx="${x}" cy="${y}" r="${
        isRoot ? 4.6 : 3.6
      }"></circle>`;
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
  const flattenSingleSection = sections.length === 1;

  const renderShapeCards = (shapes) =>
    (shapes ?? [])
      .map(
        (shape) => `
                <div class="shape-card" draggable="true" data-shape="${escapeHtml(shape.id)}">
                  <h3>${escapeHtml(getLocalizedShapeName(shape))}</h3>
                  ${renderShapeThumbnail(shape)}
                </div>
              `
      )
      .join("");

  const renderSection = (section, options = {}) => {
    const label = `${options.label ?? getLocalizedLibrarySectionLabel(section)}`.trim();
    if (flattenSingleSection) {
      return `
          <div class="shape-section shape-section--flat">
            <div class="shape-grid">
              ${renderShapeCards(section.shapes)}
            </div>
          </div>
        `;
    }

    return `
          <div class="shape-section shape-section--expanded">
            <div class="shape-section__label">
              ${escapeHtml(label)}
            </div>
            <div class="shape-grid">
              ${renderShapeCards(section.shapes)}
            </div>
          </div>
        `;
  };

  const stripSusSectionPrefix = (label = "") => `${label}`.replace(/^Sus[24]\s*[·•-]\s*/i, "").trim();

  const renderSusSectionGroup = (groupLabel, groupSections) => {
    if (!groupSections.length) {
      return "";
    }
    return `
      <div class="shape-subsection">
        <div class="shape-subsection__title">${escapeHtml(groupLabel)}</div>
        ${groupSections
          .map((section) =>
            renderSection(section, {
              label: stripSusSectionPrefix(getLocalizedLibrarySectionLabel(section)),
            })
          )
          .join("")}
      </div>
    `;
  };

  const renderCategoryBody = () => {
    if (`${category.id}` !== "sus-chords") {
      return sections.map((section) => renderSection(section)).join("");
    }

    const sus2Sections = sections.filter((section) => `${section.id}`.startsWith("sus2-"));
    const sus4Sections = sections.filter((section) => `${section.id}`.startsWith("sus4-"));
    const otherSections = sections.filter(
      (section) => !`${section.id}`.startsWith("sus2-") && !`${section.id}`.startsWith("sus4-")
    );

    return `
      ${renderSusSectionGroup("Sus2", sus2Sections)}
      ${renderSusSectionGroup("Sus4", sus4Sections)}
      ${otherSections.map((section) => renderSection(section)).join("")}
    `;
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
  const categories = groupShapesForLibrary(SCALE_SHAPES);
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
  .marker-group { pointer-events: none; }
  .marker-dot { fill: #fff; stroke: #111; stroke-width: 2.2; }
  .marker-dot.marker-open { fill: #fff7d1; stroke: #111; stroke-width: 1.5; }
  .marker-recorder-root { fill: #ede3a3; stroke-width: 2.6; }
  .marker-highlight { fill: none; stroke: #111; stroke-width: 2.4; stroke-dasharray: 4 4; }
  .marker-note { font-size: 0.85rem; font-weight: 600; fill: #111; text-anchor: middle; }
  .marker-interval { font-size: 0.65rem; fill: #777; text-anchor: middle; }
  .overlay-group { pointer-events: none; }
  .overlay-dot { fill: #fff; stroke: #111; stroke-width: 2.2; }
  .overlay-root { fill: #ede3a3; stroke: #111; stroke-width: 2; }
  .overlay-note-text {
    fill: #111; font-size: 0.85rem; font-weight: 600;
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
  if (!svg) {
    return null;
  }
  const matrix = svg.getScreenCTM();
  if (!matrix) {
    return null;
  }
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const svgPoint = point.matrixTransform(matrix.inverse());

  const topY = getStringY(STRING_COUNT - 1) - DIMENSIONS.stringSpacing / 2;
  const bottomY = getStringY(0) + DIMENSIONS.stringSpacing / 2;
  if (svgPoint.y < topY || svgPoint.y > bottomY) {
    return null;
  }

  const totalWidth = getTotalBoardWidth(state.fretCount);
  const normalizedX = state.fretboardFlipped ? totalWidth - svgPoint.x : svgPoint.x;
  let fret = 0;
  if (normalizedX > DIMENSIONS.openWidth) {
    const fretIndex = Math.floor((normalizedX - DIMENSIONS.openWidth) / DIMENSIONS.fretSpacing);
    fret = Math.min(state.fretCount, Math.max(1, fretIndex + 1));
  }

  const visualIndex = Math.min(
    STRING_COUNT - 1,
    Math.max(0, Math.floor((svgPoint.y - topY) / DIMENSIONS.stringSpacing))
  );
  const stringIndex = STRING_COUNT - 1 - visualIndex;
  return { stringIndex, fret };
}

function getLockedAnchorString(shape, fallbackStringIndex) {
  if (Number.isInteger(shape?.anchorString)) {
    return Math.max(0, Math.min(STRING_COUNT - 1, shape.anchorString));
  }
  return fallbackStringIndex;
}

function getVariantStringSetStartForPointer(shape, stringIndex) {
  const starts = shape?.dragPlacementStarts ?? shape?.drop2StringSetStarts;
  if (!Array.isArray(starts) || !starts.length) {
    return null;
  }
  const numericStarts = starts.map((value) => Number(value)).filter((value) => !Number.isNaN(value));
  if (!numericStarts.length) {
    return null;
  }
  const minStart = Math.min(...numericStarts);
  const maxStart = Math.max(...numericStarts);
  return Math.max(minStart, Math.min(maxStart, Number(stringIndex)));
}

function resolveShapePlacement(shape, cell) {
  if (!shape || !cell) {
    return null;
  }

  const dragPlacementVariants = shape.dragPlacementVariants ?? shape.drop2Variants;
  if (dragPlacementVariants) {
    const stringSetStart = getVariantStringSetStartForPointer(shape, cell.stringIndex);
    const variant = dragPlacementVariants[String(stringSetStart)];
    if (!variant) {
      return null;
    }
    const anchorString = variant.anchorString;
    const anchorFret = cell.fret;
    const positions = calculateOverlayPositions({ positions: variant.positions }, anchorString, anchorFret);
    return {
      anchorString,
      anchorFret,
      positions,
      dragStringSetStart: stringSetStart,
    };
  }

  const anchorString = getLockedAnchorString(shape, cell.stringIndex);
  const anchorFret = cell.fret;
  const positions = calculateOverlayPositions(shape, anchorString, anchorFret);
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
  const shape = SCALE_SHAPES.find((entry) => entry.id === shapeId);
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
    const shape = SCALE_SHAPES.find((entry) => entry.id === shapeId);
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
    Object.values(board.markers).forEach((marker) => {
      const { stringIndex, fret } = marker;
      const centerX = getMarkerCenterX(fret);
      const centerY = getStringY(stringIndex);
      const isRecorderRoot =
        boardIndex === state.activeBoardIndex && recorder.rootMarkerId === marker.id;
      const noteLabel = getMarkerDisplayLabel(marker);
      const intervalLabel = marker.interval
        ? `<text class="marker-interval" x="${centerX}" y="${centerY + 20}">${marker.interval}</text>`
        : "";

      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.classList.add("marker-group");
      group.dataset.id = `${stringIndex}-${fret}`;
      group.innerHTML = `
        <circle class="marker-dot marker-on ${fret === 0 ? "marker-open" : ""} ${isRecorderRoot ? "marker-recorder-root" : ""}" cx="${centerX}" cy="${centerY}" r="16"></circle>
        <text class="marker-note" x="${centerX}" y="${centerY + 6}">${noteLabel}</text>
        ${intervalLabel}
      `;
      svg.appendChild(group);
    });
  });
  renderOverlays();
  renderRealtimeMarkers();
}

function calculateOverlayPositions(shape, anchorString, anchorFret) {
  return shape.positions
    .map((offset) => {
      const stringIndex = anchorString + offset.string;
      const fret = anchorFret + offset.fret;
      if (stringIndex < 0 || stringIndex >= STRING_COUNT || fret < 0) {
        return null;
      }
      return { stringIndex, fret, interval: offset.interval };
    })
    .filter(Boolean);
}

function getOverlayShape(shapeId) {
  return SCALE_SHAPES.find((entry) => entry.id === shapeId) ?? null;
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
    `${shape?.system ?? ""}`.toLowerCase().includes("triad");
  if (isChord) {
    return degreeToken;
  }
  return DEGREE_LABEL_ALIAS[degreeToken] ?? degreeToken;
}

function getOverlayToneLabel(shape, anchorString, anchorFret, pos) {
  const degreeMap = getOverlayDegreeMap(shape);
  const degreeToken = degreeMap?.[mod12(pos.interval)] ?? `${mod12(pos.interval)}`;
  const rootNoteIndex = getPositionNoteIndex(anchorString, anchorFret);
  const rootNoteName = getOverlayPreferredNoteName(rootNoteIndex);
  const noteName =
    spellNoteFromRootAndDegree(rootNoteName, degreeToken === "R" ? "1" : degreeToken) ??
    getOverlayPreferredNoteName(getPositionNoteIndex(pos.stringIndex, pos.fret));
  return {
    noteName,
    degreeLabel: getDegreeCaption(degreeToken, shape),
    degreeToken,
  };
}

function appendOverlayDot(group, { pos, shape, anchorString, anchorFret, preview = false, overlayId = null }) {
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
  dot.setAttribute("r", isRoot ? "17" : "16");
  if (!preview && overlayId) {
    dot.dataset.overlayId = overlayId;
    dot.dataset.string = `${pos.stringIndex}`;
    dot.dataset.fret = `${pos.fret}`;
  }
  group.appendChild(dot);

  const labels = getOverlayToneLabel(shape, anchorString, anchorFret, pos);
  const noteText = document.createElementNS("http://www.w3.org/2000/svg", "text");
  noteText.setAttribute(
    "class",
    `overlay-note-text${preview ? " overlay-note-text--preview" : ""}${isRoot ? " overlay-note-text--root" : ""}`
  );
  noteText.setAttribute("x", `${centerX}`);
  noteText.setAttribute("y", `${centerY + 1}`);
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
    svgs.forEach((svg) => {
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.classList.add("overlay-group");
      overlay.positions.forEach((pos) => {
        appendOverlayDot(group, {
          pos,
          shape,
          anchorString: overlay.anchorString,
          anchorFret: overlay.anchorFret,
          overlayId: overlay.id,
        });
      });
      svg.appendChild(group);
    });
  });

  if (!dragOverlayPreview?.positions?.length) {
    return;
  }
  const previewShape = getOverlayShape(dragOverlayPreview.shapeId);
  svgs.forEach((svg) => {
    const previewGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    previewGroup.classList.add("overlay-preview-group");
    dragOverlayPreview.positions.forEach((pos) => {
      appendOverlayDot(previewGroup, {
        pos,
        shape: previewShape,
        anchorString: dragOverlayPreview.anchorString,
        anchorFret: dragOverlayPreview.anchorFret,
        preview: true,
      });
    });
    svg.appendChild(previewGroup);
  });
}

function isValidRealtimePosition(stringIndex, fret) {
  return (
    Number.isInteger(stringIndex) &&
    Number.isInteger(fret) &&
    stringIndex >= 0 &&
    stringIndex < STRING_COUNT &&
    fret >= 0 &&
    fret <= state.fretCount
  );
}

function isValidRealtimeStringIndex(stringIndex) {
  return Number.isInteger(stringIndex) && stringIndex >= 0 && stringIndex < STRING_COUNT;
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
  if (stringIndex < 0 || stringIndex >= STRING_COUNT) {
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
  const positions = getTabPositionsFromMidi(midiNote, state.fretCount);
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
        !isValidRealtimePosition(trail.toStringIndex, trail.toFret)
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
    svg.appendChild(trailGroup);
  });

  if (!realtime.markers.size) {
    return;
  }

  const markers = Array.from(realtime.markers.values());
  svgs.forEach((svg) => {
    markers.forEach((marker) => {
      if (!isValidRealtimePosition(marker.stringIndex, marker.fret)) {
        return;
      }
      const centerX = getMarkerCenterX(marker.fret);
      const centerY = getStringY(marker.stringIndex);
      const isOnsetFlash = Number.isFinite(marker.flashUntil) && marker.flashUntil > now;
      const isFxFlash = Number.isFinite(marker.fxUntil) && marker.fxUntil > now;
      const fxSet = new Set(Array.isArray(marker.fx) ? marker.fx : []);
      const hasBendFx = fxSet.has("bend");
      const hasGlissFx = fxSet.has("gliss");
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.classList.add("realtime-marker-group");
      group.innerHTML = `
        ${isOnsetFlash ? `<circle class="realtime-onset-ring" cx="${centerX}" cy="${centerY}" r="21"></circle>` : ""}
        ${isFxFlash && hasBendFx ? `<path class="realtime-bend-arc" d="M ${centerX + 14} ${centerY + 10} Q ${centerX + 26} ${centerY - 20} ${centerX + 16} ${centerY - 32}"></path>` : ""}
        ${isFxFlash && hasBendFx ? `<path class="realtime-bend-arrow" d="M ${centerX + 16} ${centerY - 32} L ${centerX + 22} ${centerY - 28} L ${centerX + 14} ${centerY - 24}"></path>` : ""}
        ${isFxFlash && hasGlissFx ? `<path class="realtime-gliss-slash" d="M ${centerX - 15} ${centerY + 14} L ${centerX + 15} ${centerY - 14}"></path>` : ""}
        <circle class="realtime-dot${isOnsetFlash ? " realtime-dot--flash" : ""}" cx="${centerX}" cy="${centerY}" r="19"></circle>
        <circle class="realtime-dot-core${isOnsetFlash ? " realtime-dot-core--flash" : ""}" cx="${centerX}" cy="${centerY}" r="14"></circle>
        <text class="realtime-note-text" x="${centerX}" y="${centerY + 6}">${getNoteName(
          getPositionNoteIndex(marker.stringIndex, marker.fret),
          state.notePreference
        )}</text>
      `;
      svg.appendChild(group);
    });
  });
}

function clearRealtimeMarkers() {
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
  if (!realtime.markers.has(eventKey)) {
    return;
  }
  realtime.markers.delete(eventKey);
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
  const shape = SCALE_SHAPES.find((entry) => entry.id === shapeId);
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
      const displayString = STRING_COUNT - overlay.anchorString;
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
  return Array.from({ length: STRING_COUNT }, (_, stringIndex) =>
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
        warnings.push(`第 ${STRING_COUNT - rowIndex} 弦存在连续两个大二度（${row[i]}, ${row[i + 1]}, ${row[i + 2]}）`);
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
  const rootStringNumber = STRING_COUNT - rootMarker.stringIndex;

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
        string: STRING_COUNT - selectedMarker.stringIndex,
        fret: selectedMarker.fret,
      })
    );
  }
  if (rootMarker) {
    statusBits.push(
      t("recorder.status.root", {
        string: STRING_COUNT - rootMarker.stringIndex,
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
                  string: STRING_COUNT - marker.stringIndex,
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
  recorder.rootMarkerId = markerId;
  recorder.output = "";
  renderMarkers();
  renderRecorderPanel();
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
  const cell = event.target.closest(".cell");
  if (!cell) {
    cancelLongPress();
    return;
  }
  const stringIndex = Number(cell.dataset.string);
  const fret = Number(cell.dataset.fret);
  const markerId = `${stringIndex}-${fret}`;
  const board = getBoardState(boardIndex);
  if (!board.markers[markerId]) {
    cancelLongPress();
    return;
  }
  startLongPress(markerId, event, boardIndex);
}

function handlePointerUp() {
  cancelLongPress();
}

function updateMarkerHint() {
  if (!dom.markerHint) {
    return;
  }
  const board = getBoardState();
  const count = Object.keys(board.markers).length;
  dom.markerHint.innerHTML = t("marker.hint", { count });
}

function handleSvgClick(event) {
  const boardIndex = getBoardIndexFromEvent(event);
  setActiveBoard(boardIndex);
  const overlayDot = event.target.closest?.(".overlay-dot");
  if (overlayDot?.dataset?.overlayId) {
    const stringIndex = Number(overlayDot.dataset.string);
    const fret = Number(overlayDot.dataset.fret);
    if (!Number.isNaN(stringIndex) && !Number.isNaN(fret)) {
      removeOverlayPosition(overlayDot.dataset.overlayId, stringIndex, fret);
      return;
    }
  }

  const target = event.target.closest(".cell");
  if (!target) {
    return;
  }
  const stringIndex = Number(target.dataset.string);
  const fret = Number(target.dataset.fret);
  const id = `${stringIndex}-${fret}`;
  if (
    longPressSuppressedId &&
    longPressSuppressedId.boardIndex === boardIndex &&
    longPressSuppressedId.markerId === id
  ) {
    longPressSuppressedId = null;
    return;
  }
  toggleMarker(boardIndex, stringIndex, fret);
}

function clearMarkers(boardIndex = state.activeBoardIndex) {
  const board = getBoardState(boardIndex);
  board.markers = {};
  board.selectedId = null;
  recorder.rootMarkerId = null;
  recorder.output = "";
  updateMarkerHint();
  renderMarkers();
  renderRecorderPanel();
}

function bindControls() {
  syncFretboardCount();

  dom.boardCountInput?.addEventListener("input", (event) => {
    if (!event?.target) {
      return;
    }
    setBoardCount(event.target.value);
  });

  dom.notePreferenceSelect?.addEventListener("change", (event) => {
    state.notePreference = event.target.value;
    renderGrid();
    renderMarkers();
  });

  dom.clearBtn?.addEventListener("click", () => {
    clearMarkers();
    clearOverlays();
  });
  dom.flipBoardBtn?.addEventListener("click", () => {
    state.fretboardFlipped = !state.fretboardFlipped;
    renderGrid();
    renderMarkers();
    renderOverlays();
  });

  dom.addBoardBtn?.addEventListener("click", () => {
    setFretCount(state.fretCount + 1);
  });
  dom.removeBoardBtn?.addEventListener("click", () => {
    setFretCount(state.fretCount - 1);
  });

  dom.languageSwitch?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-ui-lang]");
    if (!button) {
      return;
    }
    setUiLanguage(button.dataset.uiLang);
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
  dom.videoUploadBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (videoRenderer.busy) {
      return;
    }
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
  document.addEventListener("click", (event) => {
    if (!state.exportMenuOpen) {
      return;
    }
    if (!event.target.closest(".export-menu-wrap")) {
      setExportMenuOpen(false);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    if (state.exportMenuOpen) {
      setExportMenuOpen(false);
    }
    if (state.paletteOpen) {
      setPaletteOpen(false);
    }
    if (state.videoModalOpen && !videoRenderer.busy) {
      setVideoModalOpen(false);
    }
  });

  dom.shapeLibrary?.addEventListener("dragstart", handleShapeDragStart);
  dom.shapeLibrary?.addEventListener("dragend", () => {
    dragShapeId = null;
    dom.paletteBackdrop?.classList.remove("is-drag-pass-through");
    clearDragOverlayPreview();
  });
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
  state.language = getInitialUiLanguage();
  state.isFullAccess = hasFretlabFullAccess();
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
  refreshAccessUi();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
