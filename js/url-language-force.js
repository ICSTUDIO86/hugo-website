(function() {
  var path = (window.location && window.location.pathname) ? window.location.pathname : '';
  var isEnglishPath = path === '/en' || path === '/en/' || path.indexOf('/en/') === 0;
  var isProductPath = path.indexOf('/sight-reading-tool/') === 0 ||
    path.indexOf('/tools/') === 0 ||
    path.indexOf('/fretlab/') === 0 ||
    path.indexOf('/fretlab-tool/') === 0 ||
    path.indexOf('/en/sight-reading-tool/') === 0 ||
    path.indexOf('/en/tools/') === 0 ||
    path.indexOf('/en/fretlab/') === 0 ||
    path.indexOf('/en/fretlab-tool/') === 0;

  if (!isProductPath && !isEnglishPath) {
    return;
  }

  var forceLang = isEnglishPath ? 'en' : 'zh';

  try {
    if (forceLang === 'en') {
      localStorage.setItem('preferredLanguage', 'en');
      localStorage.setItem('ic-sight-reading-lang', 'en');
      localStorage.setItem('ic_fretlab_ui_language', 'en');
    } else {
      localStorage.setItem('preferredLanguage', 'zh-CN');
      localStorage.setItem('ic-sight-reading-lang', 'zh-CN');
      localStorage.setItem('ic_fretlab_ui_language', 'zh');
    }
  } catch (err) {
    // ignore storage failures
  }

  window.__IC_FORCE_LANG__ = forceLang === 'en' ? 'en' : 'zh-CN';
  window.__FRETLAB_FORCE_LANG__ = forceLang === 'en' ? 'en' : 'zh';
  window.__FRETLAB_TOOL_FORCE_LANG__ = forceLang === 'en' ? 'en' : 'zh';

  if (document && document.documentElement) {
    document.documentElement.lang = forceLang === 'en' ? 'en' : 'zh-CN';
  }
})();
