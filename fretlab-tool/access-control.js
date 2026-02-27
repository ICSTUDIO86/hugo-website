export const FRETLAB_LICENSE_STORAGE_KEY = "ic-fretlab-license-v1";
export const LEGACY_SINGLE_ACCESS_STORAGE_KEY = "ic-single-product-access";
export const LEGACY_ACCESS_KEY = "ic-fretlab-access";

const FRETLAB_TOOL_IDS = new Set(["fretlab", "freaklab"]);
const LOCAL_BLOCK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const ONLINE_ENTRY_URL = "https://icstudio.club/fretlab-tool/";
const ENABLE_LOCALHOST_BLOCK = false;

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

// Run guard at module load so a single import is enough to enforce local blocking.
enforceFretlabRuntimeGuard();
