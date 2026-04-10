/**
 * Tool Access Loader
 * - Ensures trial systems are loaded
 * - Applies single-product unlock patch per tool
 *
 * This file is safe for full-version users: it only patches when a single-tool
 * access record exists for the current tool.
 */

(function() {
  'use strict';

  if (window.__IC_TOOL_ACCESS_LOADER__) return;
  window.__IC_TOOL_ACCESS_LOADER__ = true;
  window.__IC_TOOL_ACCESS_LOADER_VERSION__ = '1.1.1';
  window.__toolAccessLoaderReady = false;

  const STORAGE_KEY = 'ic-single-product-access';
  const REFUND_RESET_KEY = 'ic-refund-reset';
  const REFUND_RESET_HANDLED_KEY = 'ic-refund-reset-handled';
  const ACCESS_RESET_KEYS = [
    'ic-bundle-license-v1',
    'ic-single-product-access',
    'ic_single_product_access',
    'ic_full_version',
    'ic_verified_from_access_page',
    'ic_verified_timestamp',
    'ic-premium-access',
    'ic-studio-payment-state',
    'ic-studio-access-codes',
    'ic_studio_access_code',
    'ic_studio_premium_activated',
    'ic_studio_activation_time',
    'ic-full-access',
    'ic-verified-user',
    'ic-access-timestamp',
    'icstudio_access_code',
    'icstudio_access_time'
  ];
  const SCRIPT_LIST = [
    {
      id: 'ic-trial-limiter-script',
      src: '/js/trial-limiter.js?v=20250909',
      check: () => !!window.trialLimiter
    },
    {
      id: 'ic-advanced-trial-protection-script',
      src: '/js/advanced-trial-protection.js?v=20260410',
      check: () => !!window.advancedTrialProtection
    },
    {
      id: 'ic-melody-counter-system-script',
      src: '/js/melody-counter-system.js?v=20250920',
      check: () => !!window.melodyCounterSystem
    },
    {
      id: 'ic-integrated-trial-manager-script',
      src: '/js/integrated-trial-manager.js?v=20250920',
      check: () => !!window.integratedTrialManager
    }
  ];

  function blockWebsiteFileAccess() {
    if (window.__IC_WEB_TRIAL_REQUIRED__ !== true || window.location.protocol !== 'file:') return false;

    document.addEventListener('DOMContentLoaded', () => {
      document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center;">
          <div style="max-width:520px;background:#fff;border-radius:24px;padding:40px 32px;box-shadow:0 20px 60px rgba(0,0,0,0.12);">
            <div style="font-size:56px;line-height:1;margin-bottom:16px;">⚠️</div>
            <h1 style="margin:0 0 12px;font-size:28px;color:#1d1d1f;">This tool must be used online</h1>
            <p style="margin:0 0 12px;font-size:16px;line-height:1.6;color:#4a4a4f;">The official IC Web tool page cannot be opened via file://. Please use the hosted website so trial and access checks can run correctly.</p>
            <a href="https://icstudio.club/tools/" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 24px;border-radius:999px;font-weight:600;">Open IC Web</a>
          </div>
        </div>
      `;
    }, { once: true });

    throw new Error('IC Web tool pages cannot be opened via file://');
  }

  function ensureCounterAlias() {
    if (window.melodyCounterSystem && !window.melodyCounter) {
      window.melodyCounter = window.melodyCounterSystem;
    }
  }

  function loadScriptIfNeeded(item) {
    try {
      if (item.check && item.check()) return Promise.resolve();
      if (item.id && document.getElementById(item.id)) return Promise.resolve();
    } catch (error) {
      // ignore
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.id = item.id;
      script.src = item.src;
      script.async = false;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });
  }

  function clearLocalAccessState() {
    try {
      ACCESS_RESET_KEYS.forEach((key) => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      // ignore
    }
  }

  function handleRefundReset() {
    try {
      const marker = localStorage.getItem(REFUND_RESET_KEY);
      if (!marker) return;
      const handled = localStorage.getItem(REFUND_RESET_HANDLED_KEY);
      if (handled === marker) return;
      clearLocalAccessState();
      localStorage.setItem(REFUND_RESET_HANDLED_KEY, marker);
      window.location.reload();
    } catch (error) {
      // ignore
    }
  }

  async function ensureTrialScripts() {
    ensureCounterAlias();
    for (const item of SCRIPT_LIST) {
      await loadScriptIfNeeded(item);
      ensureCounterAlias();
    }
    ensureCounterAlias();
    patchSafeHideAllTrialUI();
    window.__toolAccessLoaderReady = true;
  }

  function getToolId() {
    if (window.IC_SINGLE_TOOL_ID) return window.IC_SINGLE_TOOL_ID;

    const path = (window.location.pathname || '').toLowerCase();
    if (path.includes('melody')) return 'melody';
    if (path.includes('jianpu')) return 'jianpu';
    if (path.includes('rhythm')) return 'rhythm';
    if (path.includes('chord')) return 'chord';
    if (path.includes('interval')) return 'interval';
    return null;
  }

  function hasToolAccess(toolId) {
    if (!toolId) return false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      return !!(data && data.tools && data.tools[toolId] && data.tools[toolId].code);
    } catch (error) {
      return false;
    }
  }

  function patchSafeHideAllTrialUI() {
    if (!window.melodyCounterSystem || window.melodyCounterSystem.__icSafeHidePatched) return;

    window.melodyCounterSystem.hideAllTrialUI = function() {
      const selectors = [
        '.trial-warning',
        '.trial-expired',
        '.trial-limit',
        '.trial-message',
        '.trial-overlay',
        '#trial-status',
        '#melody-counter-status',
        '#zpay-container',
        '#access-code-container',
        '.payment-section'
      ];

      selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
          el.style.display = 'none';
        });
      });
    };

    window.melodyCounterSystem.__icSafeHidePatched = true;
  }

  function applySingleUnlock(toolId) {
    if (!hasToolAccess(toolId)) return false;

    window.IC_EARLY_PREMIUM_DETECTED = true;
    window.IC_PREMIUM_USER = true;
    window.IC_SINGLE_TOOL_UNLOCKED = toolId;
    patchSafeHideAllTrialUI();

    if (window.trialLimiter && !window.trialLimiter.__singleToolInlinePatched) {
      const original = window.trialLimiter.hasValidAccessCode;
      window.trialLimiter.hasValidAccessCode = function() {
        if (hasToolAccess(toolId)) return true;
        return original ? original.call(this) : false;
      };
      window.trialLimiter.__singleToolInlinePatched = true;
    }

    if (window.melodyCounterSystem && !window.melodyCounterSystem.__singleToolInlinePatched) {
      const original = window.melodyCounterSystem.hasValidLocalAccessCode;
      window.melodyCounterSystem.hasValidLocalAccessCode = function() {
        if (hasToolAccess(toolId)) return true;
        return original ? original.call(this) : false;
      };
      window.melodyCounterSystem.__singleToolInlinePatched = true;
    }

    if (window.advancedTrialProtection && !window.advancedTrialProtection.__singleToolInlinePatched) {
      const original = window.advancedTrialProtection.hasFullAccess;
      window.advancedTrialProtection.hasFullAccess = function() {
        if (hasToolAccess(toolId)) return true;
        return original ? original.call(this) : false;
      };
      window.advancedTrialProtection.__singleToolInlinePatched = true;
    }

    if (window.integratedTrialManager && !window.integratedTrialManager.__singleToolInlinePatched) {
      const original = window.integratedTrialManager.hasFullAccess;
      window.integratedTrialManager.hasFullAccess = function() {
        if (hasToolAccess(toolId)) return true;
        return original ? original.call(this) : false;
      };
      window.integratedTrialManager.__singleToolInlinePatched = true;
    }

    const fullAccessStatus = {
      success: true,
      allowed: true,
      hasFullAccess: true,
      expired: false,
      used: 0,
      total: Infinity,
      remaining: Infinity,
      message: ''
    };

    if (window.melodyCounterSystem) {
      window.melodyCounterSystem.currentStatus = fullAccessStatus;
      if (typeof window.melodyCounterSystem.showCounterStatus === 'function') {
        window.melodyCounterSystem.showCounterStatus(fullAccessStatus);
      }
      if (typeof window.melodyCounterSystem.updateGenerateButton === 'function') {
        window.melodyCounterSystem.updateGenerateButton(fullAccessStatus);
      }
      if (typeof window.melodyCounterSystem.refreshStatus === 'function') {
        window.melodyCounterSystem.refreshStatus();
      }
    }

    if (window.trialLimiter && typeof window.trialLimiter.init === 'function') {
      window.trialLimiter.init();
    }

    if (window.integratedTrialManager && typeof window.integratedTrialManager.init === 'function') {
      window.integratedTrialManager.init();
    }

    return true;
  }

  function scheduleSingleUnlock() {
    const toolId = getToolId();
    if (!toolId) return;

    let attempts = 0;
    const maxAttempts = 30;
    const timer = setInterval(() => {
      attempts += 1;
      const applied = applySingleUnlock(toolId);
      if (applied || attempts >= maxAttempts) {
        clearInterval(timer);
      }
    }, 200);
  }

  function init() {
    if (blockWebsiteFileAccess()) return;
    handleRefundReset();
    window.addEventListener('storage', (event) => {
      if (!event || event.key !== REFUND_RESET_KEY) return;
      handleRefundReset();
    });

    ensureTrialScripts()
      .then(() => {
        scheduleSingleUnlock();
      })
      .catch(() => {
        scheduleSingleUnlock();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
