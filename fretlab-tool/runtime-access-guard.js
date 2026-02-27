(function() {
  "use strict";

  var protocol = (window.location && window.location.protocol) || "";
  var origin = (window.location && window.location.origin) || "";
  var hostname = ((window.location && window.location.hostname) || "").toLowerCase();

  var isFileProtocol = protocol === "file:" || origin === "null";
  var isLocalhost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost");

  if (!isFileProtocol && !isLocalhost) {
    return;
  }

  var reasonText = isFileProtocol
    ? "检测到本地文件打开（file://）。"
    : "检测到本地服务地址（localhost）。";

  try {
    console.warn("FretLab access blocked:", reasonText);
  } catch (error) {
    // ignore console errors
  }

  var blockedHtml = [
    "<!doctype html>",
    '<html lang="zh-CN">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>无法本地使用</title>",
    "<style>",
    "body{margin:0;font-family:-apple-system,\"Helvetica Neue\",\"PingFang SC\",\"Segoe UI\",sans-serif;background:#f5f6f8;color:#111}",
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
    "<p>" + reasonText + " 请访问在线版本继续使用。</p>",
    '<a href="https://icstudio.club/fretlab-tool/">访问在线版本 →</a>',
    "</div></div>",
    "</body>",
    "</html>",
  ].join("");

  document.open();
  document.write(blockedHtml);
  document.close();
  throw new Error("fretlab-local-access-blocked");
})();
