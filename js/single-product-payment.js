/**
 * Single Product Payment (ZPay)
 * Standalone frontend system for single product purchases.
 */

(function() {
  'use strict';

  const CONFIG = window.IC_SINGLE_PRODUCT_CONFIG || {};
  const API_ENDPOINTS = CONFIG.api || {};

  const STATE = {
    methodOverlay: null,
    loading: null,
    polling: null
  };

  function initSingleProductPayment() {
    const cards = document.querySelectorAll('.single-product-card');
    if (!cards.length) return;

    cards.forEach((card) => {
      const priceValue = parseFloat(card.dataset.productPrice);
      const buyBtn = card.querySelector('[data-pay-type="buy"]');
      if (!buyBtn) return;

      buyBtn.disabled = !(priceValue && priceValue > 0);
      buyBtn.addEventListener('click', () => openMethodPicker(card));
    });
  }

  function openMethodPicker(card) {
    const productName = card.dataset.productName || 'Cognote 单个工具';
    const priceValue = parseFloat(card.dataset.productPrice);

    if (!priceValue || priceValue <= 0) {
      showToast('该产品价格尚未设置，暂时无法支付');
      return;
    }

    closeMethodPicker();

    const overlay = document.createElement('div');
    overlay.className = 'single-method-overlay';
    overlay.innerHTML = `
      <div class="single-method-modal">
        <div>
          <h3 class="single-method-title">选择支付方式</h3>
          <p class="single-method-subtitle">${productName} · ¥${priceValue.toFixed(2)}</p>
        </div>
        <div class="single-method-actions">
          <button class="single-method-btn" data-method="alipay">支付宝</button>
          <button class="single-method-btn wechat" data-method="wechat">微信支付</button>
          <button class="single-method-btn cancel" data-method="cancel">取消</button>
        </div>
      </div>
    `;

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeMethodPicker();
      }
    });

    overlay.querySelectorAll('[data-method]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const method = btn.dataset.method;
        if (method === 'cancel') {
          closeMethodPicker();
          return;
        }
        closeMethodPicker();
        startSinglePayment(card, method);
      });
    });

    document.body.appendChild(overlay);
    STATE.methodOverlay = overlay;
  }

  function closeMethodPicker() {
    if (STATE.methodOverlay) {
      STATE.methodOverlay.remove();
      STATE.methodOverlay = null;
    }
  }

  async function startSinglePayment(card, payType) {
    const toolId = card.dataset.productId || '';
    const productName = card.dataset.productName || 'Cognote 单个工具';
    const priceValue = parseFloat(card.dataset.productPrice);

    if (!priceValue || priceValue <= 0) {
      showToast('该产品价格尚未设置，暂时无法支付');
      return;
    }

    if (!API_ENDPOINTS.createPayment) {
      showToast('支付系统未配置，请稍后再试');
      return;
    }

    const paymentType = payType === 'wechat' ? 'wxpay' : 'alipay';
    showLoading('正在创建支付订单...');

    try {
      const response = await fetch(API_ENDPOINTS.createPayment, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productName,
          money: priceValue.toFixed(2),
          type: paymentType,
          tool_id: toolId
        })
      });

      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.msg || '创建支付订单失败');
      }

      hideLoading();
      closeExistingModal();

      if (paymentType === 'wxpay') {
        showWxPaymentInterface(result, productName);
      } else {
        showPaymentInterface(result, productName);
      }

      startPaymentPolling(result.out_trade_no, toolId, productName, priceValue);
    } catch (error) {
      hideLoading();
      showToast(error.message || '创建支付订单失败，请稍后再试');
    }
  }

  function closeExistingModal() {
    const modal = document.getElementById('zpay-payment-modal');
    if (modal) modal.remove();
  }

  function showPaymentInterface(paymentData, productName) {
    renderPaymentModal(paymentData, productName, 'alipay');
  }

  function showWxPaymentInterface(paymentData, productName) {
    renderPaymentModal(paymentData, productName, 'wxpay');
  }

  function renderPaymentModal(paymentData, productName, mode) {
    hideLoading();

    const modal = document.createElement('div');
    modal.id = 'zpay-payment-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      padding: 20px;
      box-sizing: border-box;
    `;

    const scrollContainer = document.createElement('div');
    scrollContainer.style.cssText = `
      width: 100%;
      max-width: 420px;
      max-height: 80vh;
      overflow-y: auto !important;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
      touch-action: pan-y;
      box-sizing: border-box;
      scrollbar-width: thin;
      scrollbar-color: ${mode === 'wxpay' ? '#09BB07' : '#1677FF'} rgba(0, 0, 0, 0.05);
    `;
    scrollContainer.className = mode === 'wxpay' ? 'wx-payment-scroll' : 'alipay-payment-scroll';

    if (mode === 'wxpay') {
      ensureWxScrollbarStyles();
    } else {
      ensureAlipayScrollbarStyles();
    }

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 0;
      border-radius: 12px;
      text-align: center;
      width: 100%;
      position: relative;
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15);
      min-height: 400px;
    `;

    const displayName = paymentData.order_info?.name || productName;
    const displayMoney = paymentData.order_info?.money || '';

    const headerGradient = mode === 'wxpay'
      ? 'linear-gradient(135deg, #09BB07 0%, #00D100 100%)'
      : 'linear-gradient(135deg, #1677FF 0%, #0E5CE6 100%)';

    const accentColor = mode === 'wxpay' ? '#09BB07' : '#1677FF';
    const accentBg = mode === 'wxpay' ? '#F0FDF4' : '#F8FBFF';
    const accentBorder = mode === 'wxpay' ? '#BBF7D0' : '#E1EDFF';
    const termBg = mode === 'wxpay' ? '#F0F9FF' : '#F5F9FF';
    const termBorder = mode === 'wxpay' ? '#E0F2FE' : '#E6F0FF';

    let paymentContent = `
      <div style="background: ${headerGradient}; padding: 24px 30px; color: white; position: relative;">
        <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
          <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div>
            <h3 style="color: white; margin: 0; font-size: 18px; font-weight: 600;">确认支付</h3>
          </div>
        </div>
        <div style="background: rgba(255,255,255,0.1); padding: 12px 16px; border-radius: 8px; margin-top: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="color: rgba(255,255,255,0.8); font-size: 14px;">商品</span>
            <span style="color: white; font-size: 14px; font-weight: 500;">${displayName}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="color: rgba(255,255,255,0.8); font-size: 14px;">订单号</span>
            <span style="color: white; font-size: 12px; font-family: monospace;">${paymentData.out_trade_no}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: rgba(255,255,255,0.8); font-size: 14px;">金额</span>
            <span style="color: white; font-size: 20px; font-weight: 600;">¥${displayMoney}</span>
          </div>
        </div>
      </div>

      <div style="padding: 24px 30px;">
        <div id="payment-terms-section" style="margin-bottom: 24px; padding: 16px; background: ${termBg}; border-radius: 8px; border: 1px solid ${termBorder}; text-align: left;">
          <label style="display: flex; align-items: flex-start; cursor: pointer; font-size: 14px; color: #333;">
            <input type="checkbox" id="payment-terms-checkbox" onchange="togglePaymentQRCode()" style="margin-right: 12px; margin-top: 2px; transform: scale(1.3); accent-color: ${accentColor};">
            <span>我已阅读并同意 <a href="#" onclick="showPaymentTermsDialog()" style="color: ${accentColor}; text-decoration: none; font-weight: 500;">《用户协议》</a> 和 <a href="#" onclick="showPaymentPrivacyDialog()" style="color: ${accentColor}; text-decoration: none; font-weight: 500;">《隐私政策》</a></span>
          </label>
        </div>

        <div id="payment-qrcode-section" style="display: none;">
    `;

    if (paymentData.img) {
      paymentContent += `
        <div style="background: ${accentBg}; border-radius: 12px; padding: 24px; margin-bottom: 20px; border: 1px solid ${accentBorder};">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <div style="width: 24px; height: 24px; background: ${accentColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 8px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M3,11H5V13H3V11M11,5H13V9H11V5M9,11H13V15H11V13H9V11M15,5H19V9H17V7H15V5M19,13V15H17V11H19V13M21,21H3V19H21V21Z"/>
              </svg>
            </div>
            <span style="color: ${accentColor}; font-weight: 600; font-size: 16px;">扫码支付</span>
          </div>
          <div style="display: flex; justify-content: center; margin-bottom: 16px;">
            <div style="padding: 12px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <img src="${paymentData.img}" alt="支付二维码" style="width: 180px; height: 180px; display: block; border-radius: 4px;">
            </div>
          </div>
          <div style="text-align: center;">
            <p style="color: ${accentColor}; font-size: 14px; margin: 0 0 4px 0; font-weight: 500;">请使用${mode === 'wxpay' ? '微信' : '支付宝'}扫描二维码</p>
            <p style="color: #666; font-size: 12px; margin: 0;">扫码后确认支付即可获得访问码</p>
          </div>
        </div>
      `;
    } else if (paymentData.payurl) {
      paymentContent += `
        <div style="background: ${accentBg}; border-radius: 12px; padding: 24px; margin-bottom: 20px; border: 1px solid ${accentBorder}; text-align: center;">
          <h4 style="color: ${accentColor}; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">${mode === 'wxpay' ? '微信支付' : '支付宝支付'}</h4>
          <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">点击下方按钮跳转完成支付</p>
          <button onclick="window.open('${paymentData.payurl}', '_blank')" style="
            background: ${headerGradient};
            color: white;
            padding: 14px 32px;
            border: none;
            border-radius: 25px;
            font-weight: 600;
            font-size: 16px;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
            width: 100%;
            max-width: 200px;
          " onmouseover="this.style.transform='translateY(-2px)';" onmouseout="this.style.transform='translateY(0)';">
            立即支付
          </button>
          <p style="color: #999; font-size: 12px; margin: 12px 0 0 0;">支付完成后页面将自动更新</p>
        </div>
      `;
    } else if (paymentData.qrcode) {
      paymentContent += `
        <div style="margin: 20px 0; padding: 20px; border: 2px dashed #ddd; border-radius: 8px; display: flex; flex-direction: column; align-items: center;">
          <p style="margin: 0 0 15px 0; color: #666; text-align: center;">扫码支付</p>
          <button onclick="window.open('${paymentData.qrcode}', '_blank')" style="
            background: #f0f0f0;
            color: #333;
            padding: 10px 20px;
            border: 1px solid #ddd;
            border-radius: 6px;
            cursor: pointer;
          ">打开二维码</button>
        </div>
      `;
    } else {
      paymentContent += `
        <div style="margin: 20px 0; display: flex; flex-direction: column; align-items: center;">
          <p style="color: #f56565; margin-bottom: 15px; text-align: center;">⚠️ 未获取到支付二维码</p>
          <p style="color: #666; font-size: 14px; text-align: center;">请联系客服处理</p>
        </div>
      `;
    }

    paymentContent += `
        <div id="payment-status" style="margin-top: 16px; padding: 16px; background: ${accentBg}; border-radius: 8px; text-align: center; border: 1px solid ${accentBorder};">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
            <div id="status-icon" style="font-size: 18px; margin-right: 8px;">🔍</div>
            <div id="status-text" style="color: ${accentColor}; font-size: 14px; font-weight: 500;">正在检测支付状态...</div>
          </div>
        </div>
      </div>
      <button onclick="window.closePaymentModal()" style="
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(255,255,255,0.9);
        border: none;
        font-size: 16px;
        color: rgba(255,255,255,0.8);
        cursor: pointer;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      " onmouseover="this.style.background='rgba(255,255,255,1)'; this.style.color='#999'" onmouseout="this.style.background='rgba(255,255,255,0.9)'; this.style.color='rgba(255,255,255,0.8)'">×</button>
    `;

    content.innerHTML = paymentContent;
    attachScrollGuards(scrollContainer);
    scrollContainer.appendChild(content);
    modal.appendChild(scrollContainer);
    document.body.appendChild(modal);

    if (!window.togglePaymentQRCode) {
      window.togglePaymentQRCode = function() {
        const checkbox = document.getElementById('payment-terms-checkbox');
        const qrcodeSection = document.getElementById('payment-qrcode-section');
        if (checkbox && qrcodeSection) {
          qrcodeSection.style.display = checkbox.checked ? 'block' : 'none';
        }
      };
    }

    if (!window.closePaymentModal) {
      window.closePaymentModal = function() {
        const modalEl = document.getElementById('zpay-payment-modal');
        if (modalEl) modalEl.remove();
      };
    }
  }

  function ensureAlipayScrollbarStyles() {
    if (document.getElementById('alipay-payment-scrollbar-styles')) return;
    const style = document.createElement('style');
    style.id = 'alipay-payment-scrollbar-styles';
    style.textContent = `
      .alipay-payment-scroll::-webkit-scrollbar { width: 6px; }
      .alipay-payment-scroll::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.05); border-radius: 3px; }
      .alipay-payment-scroll::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #1677FF 0%, #0E5CE6 100%);
        border-radius: 3px;
        transition: all 0.3s ease;
      }
      .alipay-payment-scroll::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, #0E5CE6 0%, #0A47C7 100%);
        box-shadow: 0 2px 4px rgba(22, 119, 255, 0.3);
      }
      .alipay-payment-scroll::-webkit-scrollbar-thumb:active {
        background: linear-gradient(135deg, #0A47C7 0%, #0638A8 100%);
      }
    `;
    document.head.appendChild(style);
  }

  function ensureWxScrollbarStyles() {
    if (document.getElementById('wx-payment-scrollbar-styles')) return;
    const style = document.createElement('style');
    style.id = 'wx-payment-scrollbar-styles';
    style.textContent = `
      .wx-payment-scroll::-webkit-scrollbar { width: 6px; }
      .wx-payment-scroll::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.05); border-radius: 3px; }
      .wx-payment-scroll::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #09BB07 0%, #00D100 100%);
        border-radius: 3px;
        transition: all 0.3s ease;
      }
      .wx-payment-scroll::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, #00A300 0%, #00BB00 100%);
        box-shadow: 0 2px 4px rgba(9, 187, 7, 0.3);
      }
      .wx-payment-scroll::-webkit-scrollbar-thumb:active {
        background: linear-gradient(135deg, #008800 0%, #009900 100%);
      }
    `;
    document.head.appendChild(style);
  }

  function attachScrollGuards(container) {
    container.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    container.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });
    container.addEventListener('wheel', (e) => e.stopPropagation(), { passive: false });
    container.addEventListener('scroll', (e) => e.stopPropagation(), { passive: true });
    container.addEventListener('touchend', (e) => e.stopPropagation(), { passive: true });
  }

  function startPaymentPolling(outTradeNo, toolId, productName, priceValue) {
    if (!outTradeNo || !API_ENDPOINTS.checkOrder) return;
    let pollCount = 0;
    const maxPolls = 120;

    if (STATE.polling) {
      clearInterval(STATE.polling);
      STATE.polling = null;
    }

    STATE.polling = setInterval(async () => {
      pollCount += 1;
      try {
        const response = await fetch(`${API_ENDPOINTS.checkOrder}?out_trade_no=${encodeURIComponent(outTradeNo)}`);
        const result = await response.json();

        if (result.ok && result.paid) {
          clearInterval(STATE.polling);
          STATE.polling = null;

          const statusIcon = document.getElementById('status-icon');
          const statusText = document.getElementById('status-text');

          if (statusIcon) statusIcon.textContent = '✅';
          if (statusText) statusText.textContent = '支付成功！正在生成访问码...';

          setTimeout(() => {
            if (window.closePaymentModal) {
              window.closePaymentModal();
            } else {
              closeExistingModal();
            }

            if (result.access_code) {
              handleSingleAccessSuccess(toolId, result.access_code, {
                out_trade_no: outTradeNo,
                money: priceValue.toFixed(2),
                product_name: productName
              });
            } else {
              alert('支付成功！访问码正在生成中，请稍后刷新页面查看。');
            }
          }, 2000);
        } else if (pollCount >= maxPolls) {
          clearInterval(STATE.polling);
          STATE.polling = null;

          const statusIcon = document.getElementById('status-icon');
          const statusText = document.getElementById('status-text');

          if (statusIcon) statusIcon.textContent = '⏰';
          if (statusText) statusText.textContent = '支付检测超时，请手动刷新页面确认';
        }
      } catch (error) {
        if (pollCount >= maxPolls) {
          clearInterval(STATE.polling);
          STATE.polling = null;

          const statusIcon = document.getElementById('status-icon');
          const statusText = document.getElementById('status-text');

          if (statusIcon) statusIcon.textContent = '❌';
          if (statusText) statusText.textContent = '网络错误，请手动刷新确认支付状态';
        }
      }
    }, 3000);
  }

  function handleSingleAccessSuccess(toolId, accessCode, orderInfo) {
    if (window.ICSingleProductAccess && typeof window.ICSingleProductAccess.storeAccess === 'function') {
      window.ICSingleProductAccess.storeAccess(toolId, accessCode, orderInfo);
    }

    if (window.ICSingleProductAccess && typeof window.ICSingleProductAccess.showSuccessPopup === 'function') {
      window.ICSingleProductAccess.showSuccessPopup(toolId, accessCode, orderInfo, 'payment');
    } else {
      showToast('支付成功，访问码已生成');
    }
  }

  function showLoading(message) {
    hideLoading();
    const overlay = document.createElement('div');
    overlay.className = 'single-loading-overlay';
    overlay.textContent = message || '处理中...';
    document.body.appendChild(overlay);
    STATE.loading = overlay;
  }

  function hideLoading() {
    if (STATE.loading) {
      STATE.loading.remove();
      STATE.loading = null;
    }
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'single-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 200);
    }, 2800);
  }

  document.addEventListener('DOMContentLoaded', initSingleProductPayment);
})();
