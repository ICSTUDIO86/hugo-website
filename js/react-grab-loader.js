(function() {
  'use strict';

  const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
  const params = new URLSearchParams(window.location.search);
  const hostname = window.location.hostname || '';
  const isLocalHost = LOCAL_HOSTS.has(hostname) || hostname.endsWith('.local');

  const runtimeConfig = window.IC_REACT_GRAB_CONFIG || {};
  const enabled = runtimeConfig.enabled != null
    ? !!runtimeConfig.enabled
    : (
      isLocalHost ||
      params.get('reactGrab') === '1' ||
      window.localStorage.getItem('ic_enable_react_grab') === '1'
    );

  if (!enabled) return;

  const agentName = runtimeConfig.agent ||
    params.get('reactGrabAgent') ||
    window.localStorage.getItem('ic_react_grab_agent') ||
    '';

  const coreScriptSrc = runtimeConfig.coreScriptSrc || 'https://unpkg.com/react-grab/dist/index.global.js';
  const agentScriptMap = {
    codex: 'https://unpkg.com/@react-grab/codex/dist/client.global.js'
  };

  function loadScript(src, id) {
    if (!src) return Promise.resolve(false);
    if (id && document.getElementById(id)) return Promise.resolve(true);

    return new Promise((resolve) => {
      const script = document.createElement('script');
      if (id) script.id = id;
      script.src = src;
      script.async = false;
      script.crossOrigin = 'anonymous';
      script.onload = function() {
        resolve(true);
      };
      script.onerror = function() {
        console.warn('[React Grab] Failed to load script:', src);
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }

  async function init() {
    const coreLoaded = await loadScript(coreScriptSrc, 'ic-react-grab-core');
    if (!coreLoaded) return;

    if (agentName && agentScriptMap[agentName]) {
      await loadScript(agentScriptMap[agentName], `ic-react-grab-agent-${agentName}`);
    }
  }

  init();
})();
