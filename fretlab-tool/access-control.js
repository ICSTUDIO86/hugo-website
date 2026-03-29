export const FRETLAB_LICENSE_STORAGE_KEY = "ic-fretlab-license-v1";
export const LEGACY_SINGLE_ACCESS_STORAGE_KEY = "ic-single-product-access";
export const LEGACY_ACCESS_KEY = "ic-fretlab-access";

const FRETLAB_TOOL_IDS = new Set(["fretlab", "freaklab"]);
const FRETLAB_MIDI_SOURCES = new Set(["live", "daw-midi"]);
const LOCAL_BLOCK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const ONLINE_ENTRY_URL = "https://icstudio.club/fretlab-tool/";
const ENABLE_LOCALHOST_BLOCK = false;
const INSTRUMENT_STORAGE_KEY = "ic_fretlab_instrument";
const MIDI_LOCK_TOAST_MS = 2600;
const CUSTOM_INSTRUMENT_LOCK_TOAST_MS = 2600;

function shouldBlockLocalRuntime() {
  if (typeof window === "undefined" || !window.location) {
    return { blocked: false, reasonText: "" };
  }

  const protocol = window.location.protocol || "";
  const origin = window.location.origin || "";
  const hostname = (window.location.hostname || "").toLowerCase();
  const isFileProtocol = protocol === "file:" || origin === "null";
  const isLocalhost =
    ENABLE_LOCALHOST_BLOCK &&
    (LOCAL_BLOCK_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost"));

  if (isFileProtocol) {
    return { blocked: true, reasonText: "检测到本地文件打开（file://）。" };
  }
  if (isLocalhost) {
    return { blocked: true, reasonText: "检测到本地服务地址（localhost）。" };
  }
  return { blocked: false, reasonText: "" };
}

function buildRuntimeBlockedHtml(reasonText) {
  return [
    "<!doctype html>",
    '<html lang="zh-CN">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>无法本地使用</title>",
    "<style>",
    'body{margin:0;font-family:-apple-system,"Helvetica Neue","PingFang SC","Segoe UI",sans-serif;background:#f5f6f8;color:#111}',
    ".wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px}",
    ".card{max-width:560px;background:#fff;border:1px solid #e6e8ec;border-radius:16px;box-shadow:0 20px 40px rgba(0,0,0,.08);padding:28px}",
    "h1{font-size:20px;margin:0 0 12px}",
    "p{margin:0 0 16px;color:#444;line-height:1.6}",
    "a{display:inline-block;background:#1a8cff;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:600}",
    "</style>",
    "</head>",
    "<body>",
    '<div class="wrap"><div class="card">',
    "<h1>⚠️ 无法本地使用</h1>",
    "<p>FretLab 需要在线环境以验证授权与试用状态。</p>",
    `<p>${reasonText} 请访问在线版本继续使用。</p>`,
    `<a href="${ONLINE_ENTRY_URL}">访问在线版本 →</a>`,
    "</div></div>",
    "</body>",
    "</html>",
  ].join("");
}

export function enforceFretlabRuntimeGuard() {
  if (typeof window === "undefined") {
    return false;
  }
  if (window.__FRETLAB_RUNTIME_GUARD_RAN__) {
    return false;
  }
  window.__FRETLAB_RUNTIME_GUARD_RAN__ = true;

  const { blocked, reasonText } = shouldBlockLocalRuntime();
  if (!blocked) {
    return false;
  }

  try {
    console.warn("FretLab access blocked:", reasonText);
  } catch {
    // ignore console errors
  }

  document.open();
  document.write(buildRuntimeBlockedHtml(reasonText));
  document.close();
  throw new Error("fretlab-local-access-blocked");
}

function readLegacySingleAccessStorage() {
  try {
    const raw = localStorage.getItem(LEGACY_SINGLE_ACCESS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { version: 1, tools: {} };
  } catch {
    return { version: 1, tools: {} };
  }
}

function readFretlabLicenseStorage() {
  try {
    const raw = localStorage.getItem(FRETLAB_LICENSE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeFretlabLicenseStorage(payload) {
  try {
    const safePayload = {
      version: 1,
      toolId: "fretlab",
      code: payload.code,
      verifiedAt: payload.verifiedAt || Date.now(),
      order: payload.order || null,
    };
    localStorage.setItem(FRETLAB_LICENSE_STORAGE_KEY, JSON.stringify(safePayload));
    return safePayload;
  } catch {
    return payload;
  }
}

function getLegacySingleStoredFretlabAccess() {
  const data = readLegacySingleAccessStorage();
  if (!data || !data.tools || typeof data.tools !== "object") {
    return null;
  }

  const candidates = Object.entries(data.tools);
  for (const [toolId, payload] of candidates) {
    const normalized = `${toolId ?? ""}`.toLowerCase();
    if (FRETLAB_TOOL_IDS.has(normalized) || normalized.includes("fret")) {
      if (payload && payload.code) {
        return payload;
      }
    }
  }
  return null;
}

export function hasFretlabFullAccess() {
  const dedicated = readFretlabLicenseStorage();
  if (dedicated && dedicated.code) {
    return true;
  }

  const scoped = getLegacySingleStoredFretlabAccess();
  if (scoped && scoped.code) {
    writeFretlabLicenseStorage({
      code: scoped.code,
      verifiedAt: scoped.verifiedAt || Date.now(),
      order: scoped.order || null,
    });
    return true;
  }

  try {
    const legacy = localStorage.getItem(LEGACY_ACCESS_KEY);
    if (legacy && legacy.trim()) {
      writeFretlabLicenseStorage({
        code: legacy.trim().toUpperCase(),
        verifiedAt: Date.now(),
        order: null,
      });
      return true;
    }
  } catch {
    // ignore storage errors
  }

  return false;
}

export function isFretlabLicenseStorageKey(key) {
  return (
    key === FRETLAB_LICENSE_STORAGE_KEY ||
    key === LEGACY_SINGLE_ACCESS_STORAGE_KEY ||
    key === LEGACY_ACCESS_KEY
  );
}

function getMidiLockedMessage() {
  const docLang = typeof document !== "undefined" ? document.documentElement?.lang || "" : "";
  const navLang = typeof navigator !== "undefined" ? navigator.language || "" : "";
  const lang = (docLang || navLang || "zh").toLowerCase();
  if (lang.startsWith("en")) {
    return "MIDI is a full-version feature. Please unlock first on /fretlab/.";
  }
  return "MIDI 功能仅限完整版。请先在 Landing Page 完成支付并验证访问码。";
}

function getCustomInstrumentLockedMessage() {
  const docLang = typeof document !== "undefined" ? document.documentElement?.lang || "" : "";
  const navLang = typeof navigator !== "undefined" ? navigator.language || "" : "";
  const lang = (docLang || navLang || "zh").toLowerCase();
  if (lang.startsWith("en")) {
    return "Custom Fretboard is a full-version feature. Please unlock first on /fretlab/.";
  }
  return "自定义指板仅限完整版。请先在 Landing Page 完成支付并验证访问码。";
}

function showLockedToast(id, message, durationMs) {
  if (typeof document === "undefined" || !document.body) {
    return;
  }
  const activeToast = document.getElementById(id);
  if (activeToast) {
    activeToast.remove();
  }

  const toast = document.createElement("div");
  toast.id = id;
  toast.textContent = message;
  toast.setAttribute(
    "style",
    [
      "position:fixed",
      "right:16px",
      "bottom:16px",
      "z-index:12000",
      "max-width:360px",
      "background:#c0392b",
      "color:#fff",
      "border-radius:10px",
      "padding:10px 12px",
      "font-size:13px",
      "line-height:1.45",
      "box-shadow:0 12px 28px rgba(0,0,0,.28)",
    ].join(";")
  );
  document.body.appendChild(toast);
  window.setTimeout(() => {
    toast.remove();
  }, durationMs);
}

function showMidiLockedToast() {
  showLockedToast("fretlab-midi-lock-toast", getMidiLockedMessage(), MIDI_LOCK_TOAST_MS);
}

function shouldBlockMidiForTrial() {
  return !hasFretlabFullAccess();
}

function shouldBlockCustomInstrumentForTrial() {
  return !hasFretlabFullAccess();
}

function getFallbackInstrumentId(select) {
  const lastAllowed = `${select?.dataset?.lastAllowedInstrument || ""}`.trim().toLowerCase();
  return lastAllowed && lastAllowed !== "custom" ? lastAllowed : "guitar";
}

function persistFallbackInstrumentId(instrumentId) {
  try {
    localStorage.setItem(INSTRUMENT_STORAGE_KEY, instrumentId);
  } catch {
    // ignore storage errors
  }
}

function forceTrialInstrumentFallback(select = null) {
  const targetSelect =
    select ||
    (typeof document !== "undefined" ? document.getElementById("instrumentSelect") : null);
  const fallbackInstrumentId = getFallbackInstrumentId(targetSelect);
  if (targetSelect) {
    targetSelect.value = fallbackInstrumentId;
    targetSelect.dataset.lastAllowedInstrument = fallbackInstrumentId;
  }
  persistFallbackInstrumentId(fallbackInstrumentId);
}

function syncCustomInstrumentTrialUi() {
  if (typeof document === "undefined") {
    return;
  }
  const blocked = shouldBlockCustomInstrumentForTrial();
  const instrumentSelect = document.getElementById("instrumentSelect");
  const customOption = instrumentSelect?.querySelector?.('option[value="custom"]');
  if (customOption) {
    customOption.disabled = blocked;
  }
  if (blocked && instrumentSelect?.value === "custom") {
    forceTrialInstrumentFallback(instrumentSelect);
  }
  const editButton = document.getElementById("customInstrumentEditBtn");
  if (editButton instanceof HTMLElement) {
    editButton.hidden = blocked;
    editButton.setAttribute("aria-disabled", blocked ? "true" : "false");
  }
}

function normalizeTrialInstrumentStorage() {
  if (!shouldBlockCustomInstrumentForTrial()) {
    return;
  }
  try {
    const currentInstrument = `${localStorage.getItem(INSTRUMENT_STORAGE_KEY) || ""}`.trim().toLowerCase();
    if (currentInstrument === "custom") {
      localStorage.setItem(INSTRUMENT_STORAGE_KEY, "guitar");
    }
  } catch {
    // ignore storage errors
  }
}

function installCustomInstrumentTrialGuard() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }
  if (window.__FRETLAB_CUSTOM_INSTRUMENT_GUARD_INSTALLED__) {
    return;
  }
  window.__FRETLAB_CUSTOM_INSTRUMENT_GUARD_INSTALLED__ = true;

  normalizeTrialInstrumentStorage();
  const syncUi = () => syncCustomInstrumentTrialUi();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncUi, { once: true });
  } else {
    syncUi();
  }

  document.addEventListener(
    "change",
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement) || target.id !== "instrumentSelect") {
        return;
      }
      if (target.value !== "custom") {
        target.dataset.lastAllowedInstrument = target.value;
        persistFallbackInstrumentId(target.value);
        return;
      }
      if (!shouldBlockCustomInstrumentForTrial()) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      forceTrialInstrumentFallback(target);
      showLockedToast(
        "fretlab-custom-instrument-lock-toast",
        getCustomInstrumentLockedMessage(),
        CUSTOM_INSTRUMENT_LOCK_TOAST_MS
      );
    },
    true
  );

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const editButton = target.closest("#customInstrumentEditBtn");
      if (!editButton || !shouldBlockCustomInstrumentForTrial()) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      forceTrialInstrumentFallback();
      showLockedToast(
        "fretlab-custom-instrument-lock-toast",
        getCustomInstrumentLockedMessage(),
        CUSTOM_INSTRUMENT_LOCK_TOAST_MS
      );
    },
    true
  );
}

function shouldSuppressRealtimeMidiEvent(rawData) {
  if (!shouldBlockMidiForTrial()) {
    return false;
  }
  if (!rawData) {
    return false;
  }
  try {
    const payload = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    if (!payload || typeof payload !== "object") {
      return false;
    }
    const source = `${payload.source || ""}`.trim().toLowerCase();
    return (
      (payload.type === "noteOn" || payload.type === "noteOff") &&
      FRETLAB_MIDI_SOURCES.has(source)
    );
  } catch {
    return false;
  }
}

function installWebMidiGuard() {
  if (
    typeof window === "undefined" ||
    typeof navigator === "undefined" ||
    typeof navigator.requestMIDIAccess !== "function"
  ) {
    return;
  }
  if (window.__FRETLAB_WEB_MIDI_GUARD_INSTALLED__) {
    return;
  }
  window.__FRETLAB_WEB_MIDI_GUARD_INSTALLED__ = true;

  const originalRequestMIDIAccess = navigator.requestMIDIAccess.bind(navigator);
  navigator.requestMIDIAccess = async (...args) => {
    if (shouldBlockMidiForTrial()) {
      showMidiLockedToast();
      throw new Error("fretlab-midi-full-access-required");
    }
    return originalRequestMIDIAccess(...args);
  };
}

function installRealtimeMidiEventGuard() {
  if (typeof window === "undefined" || typeof window.EventSource !== "function") {
    return;
  }
  if (window.__FRETLAB_EVENTSOURCE_MIDI_GUARD_INSTALLED__) {
    return;
  }
  window.__FRETLAB_EVENTSOURCE_MIDI_GUARD_INSTALLED__ = true;

  const OriginalEventSource = window.EventSource;
  window.EventSource = function FretlabGuardedEventSource(...args) {
    const target = new OriginalEventSource(...args);
    return new Proxy(target, {
      get(source, prop, receiver) {
        if (prop === "addEventListener") {
          return (type, listener, options) => {
            if (type === "message" && typeof listener === "function") {
              return source.addEventListener(
                type,
                (event) => {
                  if (shouldSuppressRealtimeMidiEvent(event?.data)) {
                    showMidiLockedToast();
                    return;
                  }
                  listener.call(source, event);
                },
                options
              );
            }
            return source.addEventListener(type, listener, options);
          };
        }
        return Reflect.get(source, prop, receiver);
      },
      set(source, prop, value, receiver) {
        if (prop === "onmessage" && typeof value === "function") {
          source.onmessage = function (event) {
            if (shouldSuppressRealtimeMidiEvent(event?.data)) {
              showMidiLockedToast();
              return;
            }
            return value.call(source, event);
          };
          return true;
        }
        source[prop] = value;
        return true;
      },
    });
  };
  window.EventSource.prototype = OriginalEventSource.prototype;
}

// Run guard at module load so one import is enough for runtime blocking.
enforceFretlabRuntimeGuard();
installWebMidiGuard();
installRealtimeMidiEventGuard();
installCustomInstrumentTrialGuard();
