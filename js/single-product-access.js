/**
 * Single Product Access Control
 * Handles code verification, per-tool unlock, and download popup.
 */

(function() {
  'use strict';

  const CONFIG = window.IC_SINGLE_PRODUCT_CONFIG || {};
  const STORAGE_KEY = 'ic-single-product-access';

  function readStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { version: 1, tools: {} };
    } catch (error) {
      return { version: 1, tools: {} };
    }
  }

  function writeStorage(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function storeAccess(toolId, accessCode, orderInfo) {
    if (!toolId) return;
    const data = readStorage();
    data.tools = data.tools || {};
    data.tools[toolId] = {
      code: accessCode,
      verifiedAt: Date.now(),
      order: orderInfo || null
    };
    writeStorage(data);
  }

  function getToolAccess(toolId) {
    if (!toolId) return null;
    const data = readStorage();
    return data.tools ? data.tools[toolId] : null;
  }

  function hasToolAccess(toolId) {
    const access = getToolAccess(toolId);
    return !!(access && access.code);
  }

  function getToolConfig(toolId) {
    return CONFIG.tools ? CONFIG.tools[toolId] : null;
  }

  function showSuccessPopup(toolId, accessCode, orderInfo, source) {
    const toolConfig = getToolConfig(toolId);
    if (!toolConfig) {
      alert('访问码已验证，但未找到对应产品信息');
      return;
    }
    const displayOrderNumber = (
      orderInfo?.order_info?.alipay_trade_no ||
      orderInfo?.order_info?.zpay_trade_no ||
      orderInfo?.out_trade_no ||
      orderInfo?.order_id ||
      orderInfo?.order_no ||
      orderInfo?.trade_no ||
      orderInfo?.alipay_trade_no ||
      orderInfo?.zpay_trade_no ||
      '暂无'
    );
    const productName = orderInfo?.product_name || toolConfig.name || 'Cognote';

    const popup = document.createElement('div');
    popup.id = 'single-product-success-popup';
    popup.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px; box-sizing: border-box;" id="modal-overlay">
        <div style="background: white; padding: 40px; border-radius: 16px; max-width: 500px; width: 90%; text-align: center; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3); max-height: 80vh; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;" id="modal-scroll-container">
          <div style="margin-bottom: 30px;">
            <div style="width: 80px; height: 80px; background: #4CAF50; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 48px;">✓</div>
            <h2 style="color: #333; margin-bottom: 10px;">🎉 访问验证成功！</h2>
            <p style="color: #666; font-size: 16px; margin-bottom: 0;">您的访问码已验证，现在可以使用该工具完整版功能</p>
          </div>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 30px; text-align: left;">
            <h3 style="color: #333; margin-bottom: 15px; text-align: center;">📋 验证信息</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; align-items: center; position: relative;" id="access-code-container">
              <span style="color: #666;">访问码：</span>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-family: monospace; font-weight: bold; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">${accessCode}</span>
                <button data-copy-code
                        style="background: #3b82f6; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s ease;"
                        onmouseover="this.style.background='#2563eb'"
                        onmouseout="this.style.background='#3b82f6'"
                        title="复制访问码">
                  📋
                </button>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #666;">产品：</span>
              <span>${productName}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #666;">验证时间：</span>
              <span>${new Date().toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666;">订单号：</span>
              <span style="font-family: monospace; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">${displayOrderNumber}</span>
            </div>
          </div>

          <div style="margin-bottom: 30px;">
            <h3 style="color: #333; margin-bottom: 20px;">📦 下载安装包</h3>
            <div style="display: grid; gap: 10px;">
              ${renderDownloadButtons(toolConfig)}
            </div>
            <p style="font-size: 12px; color: #888; margin-top: 15px;">下载完成后，使用以上访问码激活该工具完整版功能</p>
          </div>

          <div style="display: flex; gap: 15px; justify-content: center;">
            <button data-close
                    style="padding: 15px 30px; background: #f8f9fa; color: #333; border: 2px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s ease;"
                    onmouseover="this.style.background='#e2e8f0'"
                    onmouseout="this.style.background='#f8f9fa'">
              稍后使用
            </button>
            <button data-open-tool
                    style="padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); transition: all 0.3s ease;"
                    onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(102, 126, 234, 0.4)'"
                    onmouseout="this.style.transform='translateY(0px)'; this.style.boxShadow='0 4px 15px rgba(102, 126, 234, 0.3)'">
              开始使用
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(popup);

    const copyBtn = popup.querySelector('[data-copy-code]');
    const accessContainer = popup.querySelector('#access-code-container');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(accessCode).then(() => {
          if (accessContainer) {
            const originalBg = accessContainer.style.background;
            accessContainer.style.background = 'rgba(76, 175, 80, 0.4)';

            const copyTip = document.createElement('div');
            copyTip.style.cssText = `
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: rgba(76, 175, 80, 0.9);
              color: white;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              z-index: 1000;
              pointer-events: none;
            `;
            copyTip.textContent = '✅ 已复制';
            accessContainer.appendChild(copyTip);

            setTimeout(() => {
              accessContainer.style.background = originalBg;
              if (copyTip.parentNode) {
                copyTip.parentNode.removeChild(copyTip);
              }
            }, 1500);
          }
        }).catch(() => {
          alert('访问码已复制：' + accessCode);
        });
      });
    }

    const openBtn = popup.querySelector('[data-open-tool]');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        if (toolConfig.startUrl) {
          window.location.href = toolConfig.startUrl;
        }
      });
    }

    const closeBtn = popup.querySelector('[data-close]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => popup.remove());
    }

    popup.querySelectorAll('.popup-download-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-url');
        if (!url) return;
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    });
  }

  function renderDownloadButtons(toolConfig) {
    const downloads = toolConfig.downloads || {};
    const sizes = toolConfig.downloadSizes || {};
    const buttons = [
      {
        key: 'windows_x64',
        label: `💻 Windows 安装版${sizes.windows_x64 ? ` (${sizes.windows_x64})` : ''}`,
        style: "display: block; background: #f0f9ff; color: #1e40af; padding: 12px 20px; border: 2px solid #93c5fd; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all 0.3s ease; cursor: pointer; border: none; width: 100%;",
        hoverIn: "this.style.background='#1e40af'; this.style.color='white';",
        hoverOut: "this.style.background='#f0f9ff'; this.style.color='#1e40af';"
      },
      {
        key: 'mac_arm64',
        label: `🍎 macOS Apple Silicon${sizes.mac_arm64 ? ` (${sizes.mac_arm64})` : ''}`,
        style: "display: block; background: #fef3c7; color: #92400e; padding: 12px 20px; border: 2px solid #fbbf24; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all 0.3s ease; cursor: pointer; border: none; width: 100%;",
        hoverIn: "this.style.background='#92400e'; this.style.color='white';",
        hoverOut: "this.style.background='#fef3c7'; this.style.color='#92400e';"
      },
      {
        key: 'mac_x64',
        label: `🍎 macOS Intel${sizes.mac_x64 ? ` (${sizes.mac_x64})` : ''}`,
        style: "display: block; background: #f0fdf4; color: #166534; padding: 12px 20px; border: 2px solid #86efac; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all 0.3s ease; cursor: pointer; border: none; width: 100%;",
        hoverIn: "this.style.background='#166534'; this.style.color='white';",
        hoverOut: "this.style.background='#f0fdf4'; this.style.color='#166534';"
      },
      {
        key: 'linux_amd64',
        label: `🐧 Linux AMD64 DEB${sizes.linux_amd64 ? ` (${sizes.linux_amd64})` : ''}`,
        style: "display: block; background: #ede9fe; color: #6b21a8; padding: 12px 20px; border: 2px solid #c084fc; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all 0.3s ease; cursor: pointer; border: none; width: 100%;",
        hoverIn: "this.style.background='#6b21a8'; this.style.color='white';",
        hoverOut: "this.style.background='#ede9fe'; this.style.color='#6b21a8';"
      }
    ];

    return buttons.map((item) => {
      const url = downloads[item.key];
      if (!url) return '';
      return `
        <button class="popup-download-btn"
                data-url="${url}"
                style="${item.style}"
                onmouseover="${item.hoverIn}"
                onmouseout="${item.hoverOut}">
          ${item.label}
        </button>
      `;
    }).join('');
  }

  async function verifySingleAccessCode(accessCode) {
    if (!CONFIG.api || !CONFIG.api.verifyCode) {
      return { ok: false, msg: '验证服务未配置' };
    }

    const response = await fetch(CONFIG.api.verifyCode, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_code: accessCode })
    });

    const result = await response.json();
    return result;
  }

  function overrideLandingVerify() {
    const input = document.getElementById('access-code-input');
    const resultDiv = document.getElementById('verify-result');
    if (!input) return;

    const original = window.handleVerifyClick;
    if (typeof original !== 'function') return;

    window.handleVerifyClick = async function() {
      const code = (input.value || '').trim().toUpperCase();
      const isSingleCode = /^(MEL|JPU|RHY|CHD|INT)[A-Z0-9]{12}$/.test(code);
      if (!isSingleCode) {
        return original();
      }

      if (resultDiv) {
        resultDiv.innerHTML = '<span style="color:#1a8cff;">⏳ 正在验证访问码...</span>';
      }

      try {
        const result = await verifySingleAccessCode(code);
        if (result && result.ok && result.valid && result.tool_id) {
          storeAccess(result.tool_id, code, {
            out_trade_no: result.out_trade_no,
            money: result.amount,
            product_name: result.product_name
          });

          if (resultDiv) {
            resultDiv.innerHTML = '<span style="color:#10b981;">✅ 单件产品访问码验证成功</span>';
          }

          showSuccessPopup(result.tool_id, code, result, 'verify');
          return;
        }

        if (resultDiv) {
          resultDiv.innerHTML = `<span style="color:#e74c3c;">❌ ${result && result.msg ? result.msg : '访问码无效或已过期'}</span>`;
        }
        return;
      } catch (error) {
        if (resultDiv) {
          resultDiv.innerHTML = `<span style="color:#e74c3c;">❌ ${error.message || '验证失败，请稍后重试'}</span>`;
        }
        return;
      }
    };
  }

  function applyToolAccessOverrides(toolId) {
    if (!toolId || !hasToolAccess(toolId)) return;

    // Patch TrialLimiter
    if (window.TrialLimiter && !window.TrialLimiter.__singleToolPatched) {
      const original = window.TrialLimiter.prototype.hasValidAccessCode;
      window.TrialLimiter.prototype.hasValidAccessCode = function() {
        if (hasToolAccess(toolId)) return true;
        return original ? original.call(this) : false;
      };

      const originalStatus = window.TrialLimiter.prototype.getTrialStatus;
      if (typeof originalStatus === 'function') {
        window.TrialLimiter.prototype.getTrialStatus = function() {
          const status = originalStatus.call(this);
          if (hasToolAccess(toolId)) {
            return {
              ...status,
              allowed: true,
              hasAccess: true,
              hasFullAccess: true,
              reason: 'single-product-unlocked'
            };
          }
          return status;
        };
      }

      window.TrialLimiter.__singleToolPatched = true;
    }

    // Patch MelodyCounterSystem
    if (window.MelodyCounterSystem && !window.MelodyCounterSystem.__singleToolPatched) {
      const original = window.MelodyCounterSystem.prototype.hasValidLocalAccessCode;
      window.MelodyCounterSystem.prototype.hasValidLocalAccessCode = function() {
        if (hasToolAccess(toolId)) return true;
        return original ? original.call(this) : false;
      };
      window.MelodyCounterSystem.__singleToolPatched = true;
    }

    // Patch AdvancedTrialProtection
    if (window.AdvancedTrialProtection && !window.AdvancedTrialProtection.__singleToolPatched) {
      const original = window.AdvancedTrialProtection.prototype.hasFullAccess;
      window.AdvancedTrialProtection.prototype.hasFullAccess = function() {
        if (hasToolAccess(toolId)) return true;
        return original ? original.call(this) : false;
      };
      window.AdvancedTrialProtection.__singleToolPatched = true;
    }

    // Patch IntegratedTrialManager
    if (window.IntegratedTrialManager && !window.IntegratedTrialManager.__singleToolPatched) {
      const original = window.IntegratedTrialManager.prototype.hasFullAccess;
      window.IntegratedTrialManager.prototype.hasFullAccess = function() {
        if (hasToolAccess(toolId)) return true;
        return original ? original.call(this) : false;
      };
      window.IntegratedTrialManager.__singleToolPatched = true;
    }

    hideToolPurchaseUI();
  }

  function hideToolPurchaseUI() {
    const selectors = [
      '#zpay-container',
      '#access-code-container',
      '#trial-status',
      '.payment-section'
    ];

    selectors.forEach((selector) => {
      const element = document.querySelector(selector);
      if (element) element.style.display = 'none';
    });
  }

  function scheduleToolPatch() {
    const toolId = window.IC_SINGLE_TOOL_ID;
    if (!toolId) return;

    let attempts = 0;
    const maxAttempts = 40;

    const timer = setInterval(() => {
      attempts += 1;
      applyToolAccessOverrides(toolId);
      if (attempts >= maxAttempts) {
        clearInterval(timer);
      }
    }, 100);
  }

  window.ICSingleProductAccess = {
    storeAccess,
    getToolAccess,
    hasToolAccess,
    showSuccessPopup
  };

  document.addEventListener('DOMContentLoaded', () => {
    overrideLandingVerify();
    scheduleToolPatch();
  });
})();
