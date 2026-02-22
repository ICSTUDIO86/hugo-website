(function() {
  'use strict';

  const API_ENDPOINTS = {
    createPayment: 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/createPayment',
    checkOrder: 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/checkOrder'
  };

  const STATE = {
    loading: null,
    modal: null,
    polling: null
  };

  function normalizeAmount(raw) {
    const amount = Number.parseFloat(raw);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return amount.toFixed(2);
  }

  function getMethodLabel(method) {
    return method === 'wxpay' ? '微信支付' : '支付宝支付';
  }

  function getMethodColor(method) {
    return method === 'wxpay' ? '#09BB07' : '#1677FF';
  }

  function getMethodGradient(method) {
    return method === 'wxpay'
      ? 'linear-gradient(135deg, #09BB07 0%, #00D100 100%)'
      : 'linear-gradient(135deg, #1677FF 0%, #0E5CE6 100%)';
  }

  function closeById(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function closeLoading() {
    if (STATE.loading) {
      STATE.loading.remove();
      STATE.loading = null;
    }
  }

  function closeModal() {
    if (STATE.modal) {
      STATE.modal.remove();
      STATE.modal = null;
    }
    stopPolling();
  }

  function stopPolling() {
    if (STATE.polling) {
      clearInterval(STATE.polling);
      STATE.polling = null;
    }
  }

  function showLoading(message) {
    closeLoading();
    const overlay = document.createElement('div');
    overlay.id = 'donate-zpay-loading';
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:rgba(0,0,0,0.75)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'z-index:100000',
      'padding:16px'
    ].join(';');

    const content = document.createElement('div');
    content.style.cssText = [
      'background:#fff',
      'border-radius:14px',
      'padding:24px 28px',
      'max-width:360px',
      'width:100%',
      'text-align:center',
      'box-shadow:0 16px 48px rgba(0,0,0,0.25)'
    ].join(';');

    content.innerHTML = `
      <div style="font-size:30px; margin-bottom:10px;">⏳</div>
      <div style="font-size:18px; font-weight:600; color:#111; margin-bottom:6px;">${message || '处理中'}</div>
      <div style="font-size:13px; color:#666;">请稍候...</div>
    `;

    overlay.appendChild(content);
    document.body.appendChild(overlay);
    STATE.loading = overlay;
  }

  function showSuccessModal(method, amount) {
    closeById('donate-zpay-success-modal');

    const overlay = document.createElement('div');
    overlay.id = 'donate-zpay-success-modal';
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:rgba(0,0,0,0.6)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'z-index:100001',
      'padding:16px'
    ].join(';');

    const card = document.createElement('div');
    card.style.cssText = [
      'width:100%',
      'max-width:440px',
      'background:#fff',
      'border-radius:16px',
      'padding:24px',
      'box-shadow:0 16px 48px rgba(0,0,0,0.28)',
      'text-align:center'
    ].join(';');

    card.innerHTML = `
      <div style="font-size:38px; margin-bottom:10px;">🎉</div>
      <h3 style="margin:0 0 10px 0; font-size:22px; color:#111;">支付成功</h3>
      <p style="margin:0 0 8px 0; color:#374151;">感谢你对 IC Studio 的支持！</p>
      <p style="margin:0 0 18px 0; color:#6b7280; font-size:14px;">你的每一份支持，都会变成更多优质内容的动力。</p>
      <div style="margin:0 0 18px 0; font-size:14px; color:#4b5563;">
        已完成：<strong>${getMethodLabel(method)}</strong> · <strong>¥${amount}</strong>
      </div>
      <button id="donate-zpay-success-close" type="button" style="border:0; background:${method === 'wxpay' ? '#16a34a' : '#2563eb'}; color:#fff; padding:10px 18px; border-radius:10px; cursor:pointer; font-weight:600;">我知道了</button>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    function close() {
      closeById('donate-zpay-success-modal');
    }

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) close();
    });

    card.querySelector('#donate-zpay-success-close').addEventListener('click', close);
  }

  function showConfirmModal(method, amount, onConfirm) {
    closeById('donate-zpay-confirm-modal');

    const overlay = document.createElement('div');
    overlay.id = 'donate-zpay-confirm-modal';
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:rgba(0,0,0,0.55)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'z-index:100000',
      'padding:16px'
    ].join(';');

    const card = document.createElement('div');
    card.style.cssText = [
      'width:100%',
      'max-width:420px',
      'background:#fff',
      'border-radius:16px',
      'padding:20px',
      'box-shadow:0 16px 48px rgba(0,0,0,0.25)',
      'font-family:inherit'
    ].join(';');

    card.innerHTML = `
      <h3 style="margin:0 0 12px 0; font-size:20px; color:#111;">确认发起支付</h3>
      <p style="margin:0 0 8px 0; color:#444;">支付方式：<strong>${getMethodLabel(method)}</strong></p>
      <p style="margin:0 0 18px 0; color:#444;">支付金额：<strong>¥${amount}</strong></p>
      <div style="display:flex; gap:10px; justify-content:flex-end;">
        <button id="donate-zpay-cancel" type="button" style="border:1px solid #d4d4d8; background:#fff; color:#111; padding:8px 14px; border-radius:10px; cursor:pointer;">取消</button>
        <button id="donate-zpay-confirm" type="button" style="border:0; background:${method === 'wxpay' ? '#16a34a' : '#2563eb'}; color:#fff; padding:8px 14px; border-radius:10px; cursor:pointer;">继续支付</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    function close() {
      closeById('donate-zpay-confirm-modal');
    }

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) close();
    });

    card.querySelector('#donate-zpay-cancel').addEventListener('click', close);
    card.querySelector('#donate-zpay-confirm').addEventListener('click', function() {
      close();
      onConfirm();
    });
  }

  function buildPaymentBody(method, amount) {
    return {
      name: 'IC Studio 咖啡支持',
      money: amount,
      type: method
    };
  }

  async function createPaymentOrder(method, amount) {
    const response = await fetch(API_ENDPOINTS.createPayment, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPaymentBody(method, amount))
    });

    let result = {};
    try {
      result = await response.json();
    } catch (e) {
      throw new Error('支付服务返回格式异常');
    }

    if (!response.ok || !result.ok) {
      throw new Error(result.msg || '创建支付订单失败');
    }

    return result;
  }

  function showPaymentModal(paymentData, method, amount) {
    closeModal();

    const overlay = document.createElement('div');
    overlay.id = 'donate-zpay-payment-modal';
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:rgba(0,0,0,0.8)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'z-index:100000',
      'padding:16px'
    ].join(';');

    const scroll = document.createElement('div');
    scroll.style.cssText = [
      'width:100%',
      'max-width:430px',
      'max-height:85vh',
      'overflow-y:auto',
      'overflow-x:hidden',
      'box-sizing:border-box'
    ].join(';');

    const card = document.createElement('div');
    card.style.cssText = [
      'background:#fff',
      'border-radius:14px',
      'box-shadow:0 16px 48px rgba(0,0,0,0.25)',
      'overflow:hidden',
      'position:relative'
    ].join(';');

    const methodColor = getMethodColor(method);
    const methodGradient = getMethodGradient(method);

    const hasQRImage = !!paymentData.img;
    const hasPayUrl = !!paymentData.payurl;
    const hasQrcodeLink = !!paymentData.qrcode;

    let payContent = '';
    if (hasQRImage) {
      payContent = `
        <div style="background:${method === 'wxpay' ? '#F0FDF4' : '#F8FBFF'}; border:1px solid ${method === 'wxpay' ? '#BBF7D0' : '#E1EDFF'}; border-radius:12px; padding:18px; margin-bottom:14px; text-align:center;">
          <img src="${paymentData.img}" alt="支付二维码" style="width:190px; height:190px; display:block; margin:0 auto 12px auto; border-radius:6px; background:#fff; padding:8px; box-sizing:border-box;">
          <p style="margin:0; font-size:14px; color:${methodColor}; font-weight:600;">请使用${getMethodLabel(method).replace('支付', '')}扫码支付</p>
        </div>
      `;
    } else if (hasPayUrl) {
      payContent = `
        <div style="background:${method === 'wxpay' ? '#F0FDF4' : '#F8FBFF'}; border:1px solid ${method === 'wxpay' ? '#BBF7D0' : '#E1EDFF'}; border-radius:12px; padding:18px; margin-bottom:14px; text-align:center;">
          <p style="margin:0 0 12px 0; font-size:14px; color:#555;">未返回二维码图片，可点击按钮继续支付</p>
          <button id="donate-zpay-open-payurl" type="button" style="background:${methodGradient}; color:#fff; border:none; padding:10px 16px; border-radius:10px; cursor:pointer; font-weight:600;">打开支付页面</button>
        </div>
      `;
    } else if (hasQrcodeLink) {
      payContent = `
        <div style="background:${method === 'wxpay' ? '#F0FDF4' : '#F8FBFF'}; border:1px solid ${method === 'wxpay' ? '#BBF7D0' : '#E1EDFF'}; border-radius:12px; padding:18px; margin-bottom:14px; text-align:center;">
          <p style="margin:0 0 12px 0; font-size:14px; color:#555;">未返回二维码图片，可点击按钮打开二维码链接</p>
          <button id="donate-zpay-open-qrcode" type="button" style="background:${methodGradient}; color:#fff; border:none; padding:10px 16px; border-radius:10px; cursor:pointer; font-weight:600;">打开二维码链接</button>
        </div>
      `;
    } else {
      payContent = `
        <div style="background:#FEF2F2; border:1px solid #FECACA; border-radius:12px; padding:18px; margin-bottom:14px; text-align:center; color:#B91C1C; font-size:14px;">
          当前未获取到二维码，请稍后重试。
        </div>
      `;
    }

    card.innerHTML = `
      <div style="background:${methodGradient}; padding:18px 20px; color:#fff;">
        <h3 style="margin:0 0 6px 0; font-size:18px;">${getMethodLabel(method)}</h3>
        <div style="display:flex; justify-content:space-between; font-size:13px; opacity:0.95; gap:12px;">
          <span>订单号：${paymentData.out_trade_no || '-'}</span>
          <span>金额：¥${paymentData.order_info?.money || amount}</span>
        </div>
      </div>
      <div style="padding:18px 20px;">
        ${payContent}
        <div style="font-size:13px; color:#374151; background:${method === 'wxpay' ? '#F0FDF4' : '#EFF6FF'}; border:1px solid ${method === 'wxpay' ? '#BBF7D0' : '#BFDBFE'}; border-radius:10px; padding:10px 12px; margin-bottom:12px;">
          <span id="donate-zpay-status-icon" style="margin-right:8px;">🔍</span>
          <span id="donate-zpay-status-text" style="color:${methodColor};">正在检测支付状态...</span>
        </div>
      </div>
      <button id="donate-zpay-close" type="button" style="position:absolute; top:10px; right:10px; width:30px; height:30px; border:none; border-radius:50%; background:rgba(255,255,255,0.92); color:#666; font-size:16px; cursor:pointer;">×</button>
    `;

    scroll.appendChild(card);
    overlay.appendChild(scroll);
    document.body.appendChild(overlay);
    STATE.modal = overlay;

    function close() {
      closeModal();
    }

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) close();
    });

    const closeBtn = card.querySelector('#donate-zpay-close');
    if (closeBtn) closeBtn.addEventListener('click', close);

    const payUrlBtn = card.querySelector('#donate-zpay-open-payurl');
    if (payUrlBtn && paymentData.payurl) {
      payUrlBtn.addEventListener('click', function() {
        window.open(paymentData.payurl, '_blank');
      });
    }

    const qrcodeBtn = card.querySelector('#donate-zpay-open-qrcode');
    if (qrcodeBtn && paymentData.qrcode) {
      qrcodeBtn.addEventListener('click', function() {
        window.open(paymentData.qrcode, '_blank');
      });
    }

    startPaymentPolling(paymentData.out_trade_no, method, amount);
  }

  function updatePaymentStatus(icon, text, color) {
    const iconEl = document.getElementById('donate-zpay-status-icon');
    const textEl = document.getElementById('donate-zpay-status-text');
    if (iconEl) iconEl.textContent = icon;
    if (textEl) {
      textEl.textContent = text;
      if (color) textEl.style.color = color;
    }
  }

  function startPaymentPolling(outTradeNo, method, amount) {
    if (!outTradeNo || !API_ENDPOINTS.checkOrder) return;

    stopPolling();
    let pollCount = 0;
    const maxPolls = 120;

    STATE.polling = setInterval(async function() {
      pollCount += 1;
      try {
        const resp = await fetch(`${API_ENDPOINTS.checkOrder}?out_trade_no=${encodeURIComponent(outTradeNo)}`);
        const result = await resp.json();

        if (result.ok && result.paid) {
          stopPolling();
          updatePaymentStatus('✅', '支付成功，感谢支持！', '#16a34a');
          setTimeout(function() {
            closeModal();
            showSuccessModal(method, amount);
          }, 700);
          return;
        }

        if (pollCount >= maxPolls) {
          stopPolling();
          updatePaymentStatus('⏰', '暂未确认支付，可稍后重试。', '#d97706');
        }
      } catch (e) {
        if (pollCount >= maxPolls) {
          stopPolling();
          updatePaymentStatus('❌', '网络异常，未能确认支付状态。', '#dc2626');
        }
      }
    }, 3000);
  }

  async function startPayment(method, amount) {
    showLoading(`正在创建${getMethodLabel(method)}订单`);
    try {
      const paymentData = await createPaymentOrder(method, amount);
      closeLoading();
      showPaymentModal(paymentData, method, amount);
    } catch (error) {
      closeLoading();
      window.alert(error.message || '创建支付订单失败，请稍后重试');
    }
  }

  function submitPayment(method) {
    const amountInput = document.getElementById('zpay-amount');
    const amount = normalizeAmount(amountInput ? amountInput.value : '');

    if (!amount) {
      window.alert('请输入有效金额（大于 0）');
      if (amountInput) amountInput.focus();
      return;
    }

    showConfirmModal(method, amount, function() {
      startPayment(method, amount);
    });
  }

  function bindEvents() {
    const buttons = document.querySelectorAll('#donate-zpay-form [data-zpay-method]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', function() {
        submitPayment(btn.getAttribute('data-zpay-method'));
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }

  // Dedicated namespace for donate page only.
  window.icDonateZPay = {
    createAlipay: function() { submitPayment('alipay'); },
    createWechatPay: function() { submitPayment('wxpay'); }
  };
})();
