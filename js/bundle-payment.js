(function() {
  'use strict';

  const DEFAULT_CONFIG = {
    toolId: 'icstudio-bundle',
    amount: '148.00',
    mockPaymentSuccess: false,
    storageKey: 'ic-bundle-license-v1',
    api: {
      createPayment: 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/createBundlePayment',
      checkOrder: 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/checkBundleOrder',
      verifyCode: 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/verifyBundleAccessCode',
      lookupOrder: 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/findBundleAccessCodeByOrderNo',
      refundByAccessCode: 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/refundBundleByAccessCode'
    }
  };

  const runtimeConfig = window.IC_BUNDLE_PAYMENT_CONFIG || {};
  const CONFIG = {
    ...DEFAULT_CONFIG,
    ...runtimeConfig,
    api: {
      ...DEFAULT_CONFIG.api,
      ...(runtimeConfig.api || {})
    }
  };

  const STATE = {
    polling: null,
    lastDownloadUrl: '',
    lastDownloadAt: 0
  };
  const HAND_FONT = '"Patrick Hand", "Kalam", "Xiaolai SC", "PingFang SC", "Microsoft YaHei", cursive';
  const COGNOTE_DOWNLOADS = {
    windows_x64: 'https://636c-cloud1-4g1r5ho01a0cfd85-1377702774.tcb.qcloud.la/downloads/Cognote-1.0.0-win-x64-setup.exe',
    mac_arm64: 'https://636c-cloud1-4g1r5ho01a0cfd85-1377702774.tcb.qcloud.la/downloads/Cognote-1.0.0-mac-arm64.dmg',
    mac_x64: 'https://636c-cloud1-4g1r5ho01a0cfd85-1377702774.tcb.qcloud.la/downloads/Cognote-1.0.0-mac-x64.dmg',
    linux_amd64: 'https://636c-cloud1-4g1r5ho01a0cfd85-1377702774.tcb.qcloud.la/downloads/Cognote-1.0.0-linux-amd64.deb'
  };

  const I18N = {
    zh: {
      createOrder: '正在创建套装订单...',
      checkingOrder: '正在检查支付状态...',
      missingPaymentApi: 'Bundle 支付后端尚未配置，当前只完成了前端入口。',
      missingVerifyApi: 'Bundle 验证后端尚未配置，当前只完成了前端入口。',
      invalidCode: '请输入有效的 Bundle 访问码',
      verifySuccess: 'Bundle 访问码验证成功',
      verifyFailed: 'Bundle 访问码验证失败',
      paymentTitle: 'Bundle 套装支付',
      paymentMethodAlipay: '支付宝支付',
      paymentMethodWechat: '微信支付',
      orderLabel: '订单号',
      amountLabel: '金额',
      consentRequired: '请先勾选并同意用户协议与隐私政策，再继续支付。',
      consentReady: '已同意条款，现在可以扫码或打开支付页面完成支付。',
      termsText: '我已阅读并同意',
      termsLink: '《用户协议》',
      privacyLink: '《隐私政策》',
      close: '关闭',
      openPaymentPage: '打开支付页面',
      noQrcode: '支付二维码暂未返回，请打开支付页面继续。',
      successTitle: 'Bundle 支付成功',
      successDesc: '已生成 Bundle 访问码。这个访问码可直接解锁 Cognote 与 FretLab。',
      accessCodeLabel: '访问码',
      orderNoLabel: '订单号',
      purchaseTimeLabel: '购买时间',
      copied: '已复制',
      copy: '复制',
      useNow: '立即使用',
      useLater: '稍后使用',
      downloadTitle: '下载安装',
      downloadTip: '点击上方切换即可查看 Cognote 与 FretLab 各自的桌面版安装包。',
      downloadToolCognote: 'Cognote',
      downloadToolFretlab: 'FretLab',
      downloadWindows: 'Windows 安装版',
      downloadMacApple: 'macOS Apple Silicon',
      downloadMacIntel: 'macOS Intel',
      downloadLinux: 'Linux AMD64 DEB',
      downloadStarted: '已开始下载，请查看浏览器下载列表。',
      downloadUnavailable: '当前设备暂无可用安装包，请稍后到工具页面下载。',
      mockBadge: '前端预览模式',
      verifyUnlocked: 'Bundle 访问码已生效，可直接解锁 Cognote 与 FretLab。',
      paymentBackendPending: 'Bundle 后端未接入，目前不会真正下单。',
      networkError: '网络错误，请稍后再试'
    },
    en: {
      createOrder: 'Creating bundle order...',
      checkingOrder: 'Checking payment status...',
      missingPaymentApi: 'Bundle payment backend is not configured yet. Only the frontend entry is ready.',
      missingVerifyApi: 'Bundle verification backend is not configured yet. Only the frontend entry is ready.',
      invalidCode: 'Please enter a valid bundle access code',
      verifySuccess: 'Bundle access code verified',
      verifyFailed: 'Bundle access code verification failed',
      paymentTitle: 'Bundle Payment',
      paymentMethodAlipay: 'Alipay',
      paymentMethodWechat: 'WeChat Pay',
      orderLabel: 'Order No.',
      amountLabel: 'Amount',
      consentRequired: 'Please agree to the User Agreement and Privacy Policy before continuing.',
      consentReady: 'Agreement confirmed. You can now scan the QR code or open the payment page.',
      termsText: 'I have read and agree to the',
      termsLink: 'User Agreement',
      privacyLink: 'Privacy Policy',
      close: 'Close',
      openPaymentPage: 'Open payment page',
      noQrcode: 'QR code is not available yet. Please open the payment page to continue.',
      successTitle: 'Bundle payment successful',
      successDesc: 'A bundle access code has been generated. This code now unlocks both Cognote and FretLab.',
      accessCodeLabel: 'Access code',
      orderNoLabel: 'Order No.',
      purchaseTimeLabel: 'Purchase time',
      copied: 'Copied',
      copy: 'Copy',
      useNow: 'Use now',
      useLater: 'Later',
      downloadTitle: 'Downloads',
      downloadTip: 'Use the switcher above to view Cognote and FretLab desktop installers separately.',
      downloadToolCognote: 'Cognote',
      downloadToolFretlab: 'FretLab',
      downloadWindows: 'Windows Installer',
      downloadMacApple: 'macOS Apple Silicon',
      downloadMacIntel: 'macOS Intel',
      downloadLinux: 'Linux AMD64 DEB',
      downloadStarted: 'Download started. Check your browser downloads.',
      downloadUnavailable: 'No installer is available for this device yet. Please download it later from the tool page.',
      mockBadge: 'Frontend preview mode',
      verifyUnlocked: 'Bundle access code is active and can unlock both Cognote and FretLab.',
      paymentBackendPending: 'Bundle backend is not connected yet, so this will not create a real order.',
      networkError: 'Network error. Please try again later.'
    }
  };

  const THEMES = {
    cognote: {
      accent: '#79addc',
      accentAlt: '#5f93bf',
      surface: '#ffffff',
      surfaceAlt: '#f8fafc',
      border: '#d7e8f6',
      overlay: 'rgba(15, 23, 42, 0.58)',
      toastText: '#eff6ff'
    },
    fretlab: {
      accent: '#f59e0b',
      accentAlt: '#d97706',
      surface: '#ffffff',
      surfaceAlt: '#fffaf0',
      border: 'rgba(251, 191, 36, 0.28)',
      overlay: 'rgba(15, 23, 42, 0.52)',
      toastText: '#fff7ed'
    }
  };

  function getLang(root) {
    const attr = root && root.getAttribute ? root.getAttribute('data-bundle-lang') : '';
    if (attr === 'zh' || attr === 'en') return attr;
    const docLang = document.documentElement.lang || '';
    return docLang.toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en';
  }

  function getTheme(root) {
    const name = root && root.getAttribute ? root.getAttribute('data-bundle-theme') : '';
    return THEMES[name] || THEMES.cognote;
  }

  function getThemeName(root) {
    const name = root && root.getAttribute ? root.getAttribute('data-bundle-theme') : '';
    return name === 'fretlab' ? 'fretlab' : 'cognote';
  }

  function getProductName(root, lang) {
    const zh = root && root.getAttribute ? root.getAttribute('data-bundle-name-zh') : '';
    const en = root && root.getAttribute ? root.getAttribute('data-bundle-name-en') : '';
    return lang === 'zh'
      ? (zh || 'IC Studio 套装（Cognote + FretLab）')
      : (en || 'IC Studio Bundle (Cognote + FretLab)');
  }

  function getPlatformKey() {
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const source = (ua + ' ' + platform).toLowerCase();

    if (/iphone|ipad|android|mobile/.test(source)) return '';
    if (source.includes('win')) return 'windows_x64';
    if (source.includes('mac')) {
      if (source.includes('arm') || source.includes('apple') || source.includes('m1') || source.includes('m2') || source.includes('m3') || source.includes('m4')) {
        return 'mac_arm64';
      }
      return 'mac_x64';
    }
    if (source.includes('linux')) return 'linux_amd64';
    return '';
  }

  function getToolDownloads(tool) {
    if (tool === 'fretlab') {
      const runtime = window.FRETLAB_PAYMENT_CONFIG && window.FRETLAB_PAYMENT_CONFIG.downloads
        ? window.FRETLAB_PAYMENT_CONFIG.downloads
        : {};
      return {
        windows_x64: runtime.windows_x64 || 'https://636c-cloud1-4g1r5ho01a0cfd85-1377702774.tcb.qcloud.la/downloads/tools/fretlab/FretLab-1.0.4-win-x64-setup.exe',
        mac_arm64: runtime.mac_arm64 || 'https://636c-cloud1-4g1r5ho01a0cfd85-1377702774.tcb.qcloud.la/downloads/tools/fretlab/FretLab-1.0.4-mac-arm64.dmg',
        mac_x64: runtime.mac_x64 || 'https://636c-cloud1-4g1r5ho01a0cfd85-1377702774.tcb.qcloud.la/downloads/tools/fretlab/FretLab-1.0.4-mac-x64.dmg',
        linux_amd64: runtime.linux_amd64 || 'https://636c-cloud1-4g1r5ho01a0cfd85-1377702774.tcb.qcloud.la/downloads/tools/fretlab/FretLab-1.0.4-linux-amd64.deb'
      };
    }

    return { ...COGNOTE_DOWNLOADS };
  }

  function triggerDownload(url) {
    if (!url) return false;
    const resolvedUrl = /^https?:\/\//i.test(String(url))
      ? String(url)
      : new URL(String(url), window.location.origin).toString();
    try {
      const popup = window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
      if (popup) {
        popup.opener = null;
        return true;
      }
    } catch (_) {}
    const link = document.createElement('a');
    link.href = resolvedUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }

  function canStartDownload(url) {
    const normalized = String(url || '').trim();
    const now = Date.now();
    if (!normalized) return false;
    if (STATE.lastDownloadUrl === normalized && (now - STATE.lastDownloadAt) < 1500) {
      return false;
    }
    STATE.lastDownloadUrl = normalized;
    STATE.lastDownloadAt = now;
    return true;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getOrderNumber(orderData) {
    return String(
      (orderData && (
        orderData.out_trade_no ||
        orderData.orderOutTradeNo ||
        orderData.orderId ||
        orderData.order_id ||
        orderData.order_no ||
        orderData.trade_no ||
        orderData.alipay_trade_no ||
        orderData.zpay_trade_no ||
        (orderData.order_info && (
          orderData.order_info.out_trade_no ||
          orderData.order_info.merchant_order_no ||
          orderData.order_info.order_id ||
          orderData.order_info.order_no ||
          orderData.order_info.trade_no ||
          orderData.order_info.alipay_trade_no ||
          orderData.order_info.zpay_trade_no ||
          orderData.order_info.orderId
        ))
      )) ||
      ''
    ).trim();
  }

  function getPurchaseTimeValue(orderData) {
    if (!orderData) return '';
    return (
      orderData.purchaseDate ||
      orderData.paid_at ||
      orderData.payment_time ||
      orderData.pay_time ||
      orderData.created_at ||
      (orderData.order_info && (
        orderData.order_info.purchaseDate ||
        orderData.order_info.paid_at ||
        orderData.order_info.payment_time ||
        orderData.order_info.pay_time ||
        orderData.order_info.created_at
      )) ||
      ''
    );
  }

  function formatPurchaseTime(orderData, lang) {
    const raw = getPurchaseTimeValue(orderData);
    if (!raw) return '';
    const date = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Shanghai'
    }).format(date);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function removeNode(id) {
    const node = byId(id);
    if (node) node.remove();
  }

  function showToast(root, message, isError) {
    const theme = getTheme(root);
    const existing = byId('bundle-payment-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'bundle-payment-toast';
    toast.style.cssText = [
      'position:fixed',
      'left:50%',
      'bottom:24px',
      'transform:translateX(-50%)',
      'z-index:10030',
      'padding:12px 16px',
      'border-radius:14px',
      'max-width:min(92vw,560px)',
      'box-shadow:0 18px 40px rgba(15,23,42,.22)',
      'font:500 14px/1.5 "Inter", "PingFang SC", "Microsoft YaHei", sans-serif',
      'color:' + (isError ? '#fff7ed' : theme.toastText),
      'background:' + (isError ? '#b91c1c' : theme.accent),
      'border:1px solid ' + (isError ? '#fecaca' : theme.border)
    ].join(';');
    toast.textContent = message;
    document.body.appendChild(toast);

    window.setTimeout(function() {
      toast.remove();
    }, 2800);
  }

  function showLoading(root, message) {
    const theme = getTheme(root);
    removeNode('bundle-payment-loading');

    const overlay = document.createElement('div');
    overlay.id = 'bundle-payment-loading';
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'background:' + theme.overlay,
      'z-index:10020',
      'padding:20px'
    ].join(';');

    const card = document.createElement('div');
    card.style.cssText = [
      'width:min(92vw,320px)',
      'background:' + theme.surface,
      'border:1px solid ' + theme.border,
      'border-radius:18px',
      'padding:24px 22px',
      'text-align:center',
      'box-shadow:0 20px 44px rgba(15,23,42,.18)'
    ].join(';');

    card.innerHTML = ''
      + '<div style="width:42px;height:42px;margin:0 auto 14px;border:3px solid rgba(148,163,184,.25);border-top-color:' + theme.accent + ';border-radius:999px;animation:bundle-spin 1s linear infinite;"></div>'
      + '<div style="font:600 16px/1.4 Inter, sans-serif;color:#0f172a;">' + escapeHtml(message) + '</div>';

    if (!byId('bundle-payment-loading-style')) {
      const style = document.createElement('style');
      style.id = 'bundle-payment-loading-style';
      style.textContent = '@keyframes bundle-spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(style);
    }

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  function hideLoading() {
    removeNode('bundle-payment-loading');
  }

  function readLicense() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.storageKey) || 'null');
    } catch (_) {
      return null;
    }
  }

  function writeLicense(payload) {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(payload));
    } catch (_) {}
  }

  function persistBundleAccess(code, payload) {
    const safeCode = String(code || '').trim().toUpperCase();
    if (!safeCode) return;

    const now = Date.now();
    const orderInfo = payload && payload.order ? payload.order : (payload && payload.order_info ? payload : null);
    const bundleLicense = {
      version: 1,
      toolId: 'bundle',
      code: safeCode,
      verifiedAt: payload && payload.verifiedAt ? payload.verifiedAt : now,
      order: orderInfo || null,
      unlockTools: ['cognote', 'fretlab']
    };

    writeLicense(bundleLicense);

    try {
      localStorage.setItem('ic-fretlab-access', safeCode);
      localStorage.setItem('ic-fretlab-license-v1', JSON.stringify({
        version: 1,
        toolId: 'fretlab',
        code: safeCode,
        verifiedAt: now,
        order: orderInfo || null
      }));

      localStorage.setItem('ic_full_version', 'true');
      localStorage.setItem('ic_verified_from_access_page', 'true');
      localStorage.setItem('ic_verified_timestamp', String(now));
      localStorage.setItem('ic-studio-payment-state', JSON.stringify({
        hasPaid: true,
        accessCode: safeCode,
        paidAt: new Date(now).toISOString(),
        orderInfo: orderInfo && orderInfo.order_info ? orderInfo.order_info : orderInfo || null,
        version: 'bundle-1'
      }));
      localStorage.setItem('ic-premium-access', JSON.stringify({
        code: safeCode,
        activatedAt: now,
        deviceId: (window.trialLimiter && window.trialLimiter.deviceId) || 'bundle',
        features: ['sight-reading-tool', 'fretlab-tool'],
        version: 'bundle-1',
        serverVerified: true,
        productName: (payload && payload.product_name) || 'IC Studio Bundle',
        amount: (payload && payload.amount) || CONFIG.amount,
        orderInfo: orderInfo && orderInfo.order_info ? orderInfo.order_info : orderInfo || null
      }));
    } catch (_) {}
  }

  function clearBundleAccess() {
    const keys = [
      CONFIG.storageKey,
      'ic-fretlab-access',
      'ic-fretlab-license-v1',
      'ic_full_version',
      'ic_verified_from_access_page',
      'ic_verified_timestamp',
      'ic-studio-payment-state',
      'ic-premium-access'
    ];

    keys.forEach(function(key) {
      try {
        localStorage.removeItem(key);
      } catch (_) {}
    });
  }

  function generateMockCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'BDL';
    for (let i = 0; i < 10; i += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  function startPolling(root, orderNo, lang) {
    window.clearInterval(STATE.polling);
    if (!CONFIG.api.checkOrder || !orderNo) return;

    STATE.polling = window.setInterval(async function() {
      try {
        const response = await fetch(CONFIG.api.checkOrder, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            out_trade_no: orderNo,
            tool_id: CONFIG.toolId
          })
        });
        const result = await response.json();
        const payload = result && result.data ? result.data : result;
        const isPaid = payload && (payload.paid === true || payload.status === 'paid' || payload.trade_status === 'TRADE_SUCCESS');
        const accessCode = payload && (payload.access_code || payload.accessCode || payload.code);

        if (isPaid && accessCode) {
          window.clearInterval(STATE.polling);
          STATE.polling = null;
          hideLoading();
          removeNode('bundle-payment-modal');
          showSuccessModal(root, lang, accessCode, payload);
        }
      } catch (_) {}
    }, 2500);
  }

  function buildPaymentInnerContent(text, accent, borderColor, paymentData) {
    if (paymentData.img) {
      return ''
        + '<div style="display:flex;justify-content:center;align-items:center;padding:8px 0 4px;">'
        + '  <div style="display:flex;justify-content:center;align-items:center;width:212px;height:212px;background:#fff;border:1px solid ' + borderColor + ';border-radius:14px;padding:10px;margin:0 auto;">'
        + '    <img src="' + escapeHtml(paymentData.img) + '" alt="payment qr" style="width:180px;height:180px;display:block;border-radius:4px;" />'
        + '  </div>'
        + '</div>';
    }

    if (paymentData.payurl) {
      return ''
        + '<div style="display:flex;justify-content:center;align-items:center;padding:10px 0 2px;">'
        + '  <a href="' + escapeHtml(paymentData.payurl) + '" target="_blank" rel="noreferrer"'
        + ' style="display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 20px;border-radius:10px;background:' + accent + ';color:#fff;text-decoration:none;font-weight:600;">'
        + text.openPaymentPage
        + '  </a>'
        + '</div>';
    }

    return ''
      + '<div style="padding:18px;border-radius:12px;background:#f8fafc;border:1px dashed ' + borderColor + ';font-size:13px;line-height:1.6;color:#64748b;text-align:center;">'
      + escapeHtml(text.noQrcode)
      + '</div>';
  }

  function renderCognotePaymentModal(root, lang, method, paymentData, text) {
    const accent = method === 'wxpay' ? '#09BB07' : '#1677FF';
    const accentAlt = method === 'wxpay' ? '#078B05' : '#0E5CE6';
    const payTypeLabel = method === 'wxpay' ? text.paymentMethodWechat : text.paymentMethodAlipay;

    const modal = document.createElement('div');
    modal.id = 'bundle-payment-modal';
    modal.style.cssText = [
      'position:fixed',
      'inset:0',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:20px',
      'background:rgba(0,0,0,.8)',
      'z-index:10025'
    ].join(';');

    modal.innerHTML = ''
      + '<div style="width:min(420px,100%);max-height:80vh;overflow:auto;background:#fff;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.15);">'
      + '  <div style="background:linear-gradient(135deg,' + accent + ' 0%,' + accentAlt + ' 100%);padding:24px 30px;color:#fff;position:relative;">'
      + '    <div style="display:flex;align-items:center;justify-content:center;margin-bottom:8px;">'
      + '      <div style="width:32px;height:32px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;margin-right:12px;">'
      + '        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'
      + '      </div>'
      + '      <h3 style="color:#fff;margin:0;font-size:18px;font-weight:600;">确认支付</h3>'
      + '    </div>'
      + '    <button type="button" id="bundle-payment-close" style="position:absolute;top:18px;right:18px;border:none;background:rgba(255,255,255,.16);color:#fff;border-radius:999px;width:34px;height:34px;font-size:20px;cursor:pointer;">×</button>'
      + '    <div style="background:rgba(255,255,255,.1);padding:12px 16px;border-radius:8px;margin-top:16px;">'
      + '      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'
      + '        <span style="color:rgba(255,255,255,.82);font-size:14px;">商品</span>'
      + '        <span style="color:#fff;font-size:14px;font-weight:500;">' + escapeHtml(getProductName(root, lang)) + '</span>'
      + '      </div>'
      + '      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'
      + '        <span style="color:rgba(255,255,255,.82);font-size:14px;">' + text.orderLabel + '</span>'
      + '        <span style="color:#fff;font-size:12px;font-family:monospace;">' + escapeHtml(paymentData.out_trade_no || '-') + '</span>'
      + '      </div>'
      + '      <div style="display:flex;justify-content:space-between;align-items:center;">'
      + '        <span style="color:rgba(255,255,255,.82);font-size:14px;">' + text.amountLabel + '</span>'
      + '        <span style="color:#fff;font-size:20px;font-weight:600;">¥' + escapeHtml((paymentData.order_info && paymentData.order_info.money) || CONFIG.amount) + '</span>'
      + '      </div>'
      + '    </div>'
      + '  </div>'
      + '  <div style="padding:24px 30px;">'
      + '    <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;font-size:14px;color:#333;text-align:left;padding:16px;background:#F5F9FF;border-radius:8px;border:1px solid #E6F0FF;">'
      + '      <input type="checkbox" id="bundle-payment-consent" style="margin-top:2px;transform:scale(1.3);accent-color:' + accent + ';" />'
      + '      <span>' + text.termsText + ' <a href="/terms-of-use/" target="_blank" rel="noreferrer" style="color:' + accent + ';text-decoration:none;font-weight:500;">' + text.termsLink + '</a> ' + (lang === 'zh' ? '和' : 'and') + ' <a href="/privacy-policy/" target="_blank" rel="noreferrer" style="color:' + accent + ';text-decoration:none;font-weight:500;">' + text.privacyLink + '</a></span>'
      + '    </label>'
      + '    <div id="bundle-payment-status" style="margin-top:14px;padding:12px 14px;background:' + (method === 'wxpay' ? '#F0FFF4' : '#F8FBFF') + ';border:1px solid ' + (method === 'wxpay' ? '#C6F6D5' : '#E1EDFF') + ';border-radius:10px;font-size:14px;color:' + accent + ';font-weight:500;text-align:center;">' + text.consentRequired + '</div>'
      + '    <div id="bundle-payment-body" style="display:none;margin-top:18px;">'
      +         buildPaymentInnerContent(text, accent, method === 'wxpay' ? '#BBF7D0' : '#BFDBFE', paymentData)
      + '      <div style="margin-top:10px;text-align:center;color:' + accent + ';font-size:14px;font-weight:500;">' + escapeHtml(payTypeLabel) + '</div>'
      + '      <div style="margin-top:4px;text-align:center;color:#666;font-size:12px;">' + (lang === 'zh' ? '完成支付后页面将自动更新' : 'The page will update automatically after payment') + '</div>'
      + '    </div>'
      + '    <div style="display:flex;justify-content:center;margin-top:18px;">'
      + '      <button type="button" id="bundle-payment-bottom-close" style="border:none;background:#f3f4f6;color:#111827;border-radius:8px;padding:10px 24px;cursor:pointer;font-size:14px;font-weight:600;">' + text.close + '</button>'
      + '    </div>'
      + '  </div>'
      + '</div>';

    document.body.appendChild(modal);
    return modal;
  }

  function renderFretlabPaymentModal(root, lang, method, paymentData, text) {
    const accent = method === 'wxpay' ? '#16a34a' : '#2563eb';
    const payTypeLabel = method === 'wxpay' ? text.paymentMethodWechat : text.paymentMethodAlipay;

    const modal = document.createElement('div');
    modal.id = 'bundle-payment-modal';
    modal.style.cssText = [
      'position:fixed',
      'inset:0',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:20px',
      'background:rgba(0,0,0,.72)',
      'z-index:10025'
    ].join(';');

    modal.innerHTML = ''
      + '<div style="width:min(460px,100%);background:#fff;border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.28);overflow:hidden;">'
      + '  <div style="padding:18px 20px;background:' + accent + ';color:#fff;">'
      + '    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">'
      + '      <div>'
      + '        <div style="font-size:18px;font-weight:700;">' + escapeHtml(payTypeLabel) + '</div>'
      + '        <div style="margin-top:6px;font-size:13px;opacity:.95;">' + text.orderLabel + '：' + escapeHtml(paymentData.out_trade_no || '-') + '</div>'
      + '        <div style="margin-top:4px;font-size:13px;opacity:.95;">' + text.amountLabel + '：¥' + escapeHtml((paymentData.order_info && paymentData.order_info.money) || CONFIG.amount) + '</div>'
      + '      </div>'
      + '      <button type="button" id="bundle-payment-close" style="border:none;background:rgba(255,255,255,.16);color:#fff;border-radius:999px;width:34px;height:34px;font-size:20px;cursor:pointer;">×</button>'
      + '    </div>'
      + '  </div>'
      + '  <div style="padding:18px 20px;">'
      + '    <label style="display:flex;align-items:flex-start;gap:10px;padding:14px 16px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;font-size:14px;line-height:1.6;color:#334155;text-align:left;">'
      + '      <input type="checkbox" id="bundle-payment-consent" style="margin-top:3px;transform:scale(1.15);accent-color:' + accent + ';" />'
      + '      <span>' + text.termsText + ' <a href="/terms-of-use/" target="_blank" rel="noreferrer" style="color:' + accent + ';text-decoration:none;font-weight:600;">' + text.termsLink + '</a> ' + (lang === 'zh' ? '和' : 'and') + ' <a href="/privacy-policy/" target="_blank" rel="noreferrer" style="color:' + accent + ';text-decoration:none;font-weight:600;">' + text.privacyLink + '</a></span>'
      + '    </label>'
      + '    <div id="bundle-payment-body" style="display:none;justify-content:center;align-items:center;min-height:190px;margin-top:16px;text-align:center;">'
      +         buildPaymentInnerContent(text, accent, '#e5e7eb', paymentData)
      + '    </div>'
      + '    <div id="bundle-payment-status" style="margin-top:14px;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;color:#334155;text-align:center;">' + text.consentRequired + '</div>'
      + '    <div style="margin-top:14px;display:flex;justify-content:flex-end;">'
      + '      <button type="button" id="bundle-payment-bottom-close" style="border:none;background:#f3f4f6;color:#111827;border-radius:8px;padding:8px 12px;cursor:pointer;">' + text.close + '</button>'
      + '    </div>'
      + '  </div>'
      + '</div>';

    document.body.appendChild(modal);
    return modal;
  }

  function renderPaymentModal(root, lang, method, paymentData) {
    const text = I18N[lang];
    removeNode('bundle-payment-modal');
    const themeName = getThemeName(root);
    const modal = themeName === 'fretlab'
      ? renderFretlabPaymentModal(root, lang, method, paymentData, text)
      : renderCognotePaymentModal(root, lang, method, paymentData, text);

    ['bundle-payment-close', 'bundle-payment-bottom-close'].forEach(function(id) {
      const closeButton = byId(id);
      if (closeButton) {
        closeButton.addEventListener('click', function() {
          removeNode('bundle-payment-modal');
        });
      }
    });

    modal.addEventListener('click', function(event) {
      if (event.target === modal) {
        removeNode('bundle-payment-modal');
      }
    });

    const consent = byId('bundle-payment-consent');
    const status = byId('bundle-payment-status');
    const body = byId('bundle-payment-body');

    if (consent) {
      consent.addEventListener('change', function() {
        const enabled = consent.checked;
        body.style.display = enabled ? (themeName === 'fretlab' ? 'flex' : 'block') : 'none';
        status.textContent = enabled ? text.consentReady : text.consentRequired;
        if (enabled && paymentData.out_trade_no) {
          startPolling(root, paymentData.out_trade_no, lang);
        }
      });
    }
  }

  function getDownloadPlatforms(text) {
    return [
      { key: 'windows_x64', icon: 'windows', label: text.downloadWindows },
      { key: 'mac_arm64', icon: 'apple', label: text.downloadMacApple },
      { key: 'mac_x64', icon: 'apple', label: text.downloadMacIntel },
      { key: 'linux_amd64', icon: 'linux', label: text.downloadLinux }
    ];
  }

  function getDownloadPlatformIcon(name, color, dimmed) {
    const stroke = dimmed ? 'rgba(148,163,184,.72)' : (color || '#79addc');
    const common = 'width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"';
    if (name === 'apple') {
      return ''
        + '<svg ' + common + '>'
        + '  <path d="M14.65 4.2c.56-.69.93-1.63.83-2.58-.82.04-1.84.55-2.42 1.24-.53.62-.98 1.58-.86 2.5.92.07 1.86-.46 2.45-1.16Z" fill="' + stroke + '"/>'
        + '  <path d="M18.44 12.97c.02-2.17 1.78-3.21 1.86-3.25-.99-1.45-2.54-1.65-3.08-1.67-1.31-.14-2.56.77-3.23.77-.67 0-1.7-.75-2.79-.73-1.44.02-2.77.83-3.51 2.12-1.5 2.6-.38 6.46 1.08 8.57.71 1.02 1.56 2.17 2.67 2.13 1.07-.04 1.47-.69 2.77-.69 1.3 0 1.66.69 2.79.66 1.15-.02 1.88-1.05 2.58-2.08.82-1.19 1.16-2.34 1.18-2.4-.03-.01-2.27-.87-2.32-3.43Z" fill="' + stroke + '"/>'
        + '</svg>';
    }
    if (name === 'linux') {
      return ''
        + '<svg ' + common + '>'
        + '  <path d="M9.1 6.2C9.42 4.64 10.48 3.5 12 3.5c1.52 0 2.58 1.14 2.9 2.7.18.89.2 1.92.08 3.08-.16 1.45-.04 2.3.76 3.52.84 1.28 1.42 2.78 1.42 4.12 0 2.11-1.11 3.36-2.74 3.36-.84 0-1.27-.33-2.42-.33s-1.58.33-2.42.33c-1.63 0-2.74-1.25-2.74-3.36 0-1.34.58-2.84 1.42-4.12.8-1.22.92-2.07.76-3.52-.12-1.16-.1-2.18.08-3.08Z" stroke="' + stroke + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>'
        + '  <path d="M9.4 7.6c0-.94.61-1.59 1.52-1.59.52 0 .95.16 1.08.45.13-.29.56-.45 1.08-.45.91 0 1.52.65 1.52 1.59 0 .83-.13 1.62-.53 2.48" stroke="' + stroke + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>'
        + '  <ellipse cx="10.23" cy="8.4" rx="0.72" ry="0.9" fill="' + stroke + '"/>'
        + '  <ellipse cx="13.77" cy="8.4" rx="0.72" ry="0.9" fill="' + stroke + '"/>'
        + '  <path d="M10.35 10.78c.59-.55 1.14-.82 1.65-.82s1.06.27 1.65.82c-.47.78-1.03 1.17-1.65 1.17s-1.18-.39-1.65-1.17Z" stroke="' + stroke + '" stroke-width="1.6" stroke-linejoin="round"/>'
        + '  <path d="M8.25 14.25c-.91.26-1.83.8-2.49 1.56-.35.4-.5.83-.37 1.18.13.35.49.52 1.06.55l-.45 1.78c-.11.42.02.71.33.88.57.31 1.41.1 2.43-.55.78-.49 1.21-.66 1.91-.79" stroke="' + stroke + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>'
        + '  <path d="M15.75 14.25c.91.26 1.83.8 2.49 1.56.35.4.5.83.37 1.18-.13.35-.49.52-1.06.55l.45 1.78c.11.42-.02.71-.33.88-.57.31-1.41.1-2.43-.55-.78-.49-1.21-.66-1.91-.79" stroke="' + stroke + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>'
        + '  <path d="M9.7 20.15c.78.22 1.48.35 2.3.35.82 0 1.52-.13 2.3-.35" stroke="' + stroke + '" stroke-width="1.7" stroke-linecap="round"/>'
        + '</svg>';
    }
    return ''
      + '<svg ' + common + '>'
      + '  <rect x="4" y="5" width="16" height="11" rx="2.2" stroke="' + stroke + '" stroke-width="1.8"/>'
      + '  <path d="M9 19h6" stroke="' + stroke + '" stroke-width="1.8" stroke-linecap="round"/>'
      + '  <path d="M12 16v3" stroke="' + stroke + '" stroke-width="1.8" stroke-linecap="round"/>'
      + '</svg>';
  }

  function renderSuccessDownloadButtons(tool, themeName, text, customDownloads) {
    const isFretlab = themeName === 'fretlab';
    const downloads = customDownloads || getToolDownloads(tool);
    return getDownloadPlatforms(text).map(function(platform) {
      const url = String(downloads[platform.key] || '').trim();
      const enabled = Boolean(url);
      const buttonStyle = isFretlab
        ? 'width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;padding:10px 12px;border-radius:10px;font-family:' + HAND_FONT + ';font-size:14px;line-height:1.35;'
        : 'width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;padding:10px 12px;border-radius:12px;font:600 14px/1.35 Inter, sans-serif;';
      const enabledStyle = isFretlab
        ? 'border:2px solid rgba(17,24,39,.85);background:#fff;color:#111827;cursor:pointer;box-shadow:0 2px 0 rgba(17,24,39,.18);'
        : 'border:1px solid #cbd5e1;background:#fff;color:#0f172a;cursor:pointer;';
      const disabledStyle = isFretlab
        ? 'border:1px dashed rgba(148,163,184,.45);background:#f8fafc;color:#94a3b8;cursor:not-allowed;'
        : 'border:1px dashed #cbd5e1;background:#f8fafc;color:#94a3b8;cursor:not-allowed;';
      return ''
        + '<button type="button" class="bundle-success-download-btn" data-bundle-download-tool="' + escapeHtml(tool) + '" data-url="' + escapeHtml(url) + '"'
        + ' style="' + buttonStyle + (enabled ? enabledStyle : disabledStyle) + '">'
        + '  <span style="display:inline-flex;align-items:center;gap:10px;min-width:0;">'
        + '    <span style="display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;">' + getDownloadPlatformIcon(platform.icon, isFretlab ? '#111827' : '#79addc', !enabled) + '</span>'
        + '    <span>' + escapeHtml(platform.label) + '</span>'
        + '  </span>'
        + '  <span aria-hidden="true" style="opacity:' + (enabled ? '1' : '.45') + ';">↗</span>'
        + '</button>';
    }).join('');
  }

  function buildSuccessDownloadsHtml(themeName, text, defaultTool, options) {
    const settings = options || {};
    const isFretlab = themeName === 'fretlab';
    const sectionBg = isFretlab ? '#fffbeb' : '#f8fbff';
    const sectionBorder = isFretlab ? 'rgba(217,119,6,.24)' : '#dbeafe';
    const titleColor = isFretlab ? '#92400e' : '#1d4ed8';
    const onlyTool = settings.toolOnly === 'cognote' || settings.toolOnly === 'fretlab'
      ? settings.toolOnly
      : '';
    const switchBase = isFretlab
      ? 'display:inline-flex;align-items:center;justify-content:center;min-width:120px;height:42px;padding:0 16px;border-radius:999px;border:2px dashed rgba(17,24,39,.28);background:#fff;color:#374151;font:700 14px/1 ' + HAND_FONT + ';cursor:pointer;transition:all .18s ease;'
      : 'display:inline-flex;align-items:center;justify-content:center;min-width:120px;height:42px;padding:0 16px;border-radius:999px;border:1px solid #cbd5e1;background:#fff;color:#475569;font:700 14px/1 Inter, sans-serif;cursor:pointer;transition:all .18s ease;';

    if (onlyTool) {
      return ''
        + '<div style="margin-top:18px;padding:16px;border-radius:18px;background:' + sectionBg + ';border:1px solid ' + sectionBorder + ';">'
        + '  <div style="font:700 14px/1.4 ' + (isFretlab ? HAND_FONT : 'Inter, sans-serif') + ';color:' + titleColor + ';">' + text.downloadTitle + '</div>'
        + '  <div data-bundle-download-panel="' + escapeHtml(onlyTool) + '" style="display:grid;grid-template-columns:1fr;gap:10px;margin-top:14px;">'
        +      renderSuccessDownloadButtons(onlyTool, themeName, text, settings.downloads || null)
        + '  </div>'
        + '</div>';
    }

    return ''
      + '<div style="margin-top:18px;padding:16px;border-radius:18px;background:' + sectionBg + ';border:1px solid ' + sectionBorder + ';">'
      + '  <div style="font:700 14px/1.4 ' + (isFretlab ? HAND_FONT : 'Inter, sans-serif') + ';color:' + titleColor + ';">' + text.downloadTitle + '</div>'
      + '  <div id="bundle-download-switcher" data-active-tool="' + escapeHtml(defaultTool) + '" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:14px;">'
      + '    <button type="button" class="bundle-download-switch-btn" data-bundle-switch-tool="cognote" style="' + switchBase + '">' + text.downloadToolCognote + '</button>'
      + '    <button type="button" class="bundle-download-switch-btn" data-bundle-switch-tool="fretlab" style="' + switchBase + '">' + text.downloadToolFretlab + '</button>'
      + '  </div>'
      + '  <div id="bundle-download-panel-cognote" data-bundle-download-panel="cognote" style="display:' + (defaultTool === 'cognote' ? 'grid' : 'none') + ';grid-template-columns:1fr;gap:10px;margin-top:14px;">'
      +      renderSuccessDownloadButtons('cognote', themeName, text)
      + '  </div>'
      + '  <div id="bundle-download-panel-fretlab" data-bundle-download-panel="fretlab" style="display:' + (defaultTool === 'fretlab' ? 'grid' : 'none') + ';grid-template-columns:1fr;gap:10px;margin-top:14px;">'
      +      renderSuccessDownloadButtons('fretlab', themeName, text)
      + '  </div>'
      + '</div>';
  }

  function renderCognoteSuccessModal(root, lang, accessCode, text, theme, orderData, options) {
    const settings = options || {};
    const orderNumber = getOrderNumber(orderData);
    const purchaseTime = formatPurchaseTime(orderData, lang);
    const successTitle = settings.successTitle || text.successTitle;
    const modal = document.createElement('div');
    modal.id = 'bundle-success-modal';
    modal.style.cssText = [
      'position:fixed',
      'inset:0',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:20px',
      'background:' + theme.overlay,
      'z-index:10026'
    ].join(';');

    modal.innerHTML = ''
      + '<div style="width:min(92vw,500px);background:#fff;border-radius:18px;box-shadow:0 24px 52px rgba(15,23,42,.26);overflow:hidden;">'
      + '  <div style="padding:24px 28px;background:' + theme.accent + ';color:#fff;text-align:center;">'
      + '    <div style="display:flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:999px;background:rgba(255,255,255,.16);margin:0 auto 12px;font-size:28px;">✓</div>'
      + '    <h3 style="margin:0;font:700 24px/1.3 Inter, sans-serif;color:#fff;">' + escapeHtml(successTitle) + '</h3>'
      + '  </div>'
      + '  <div style="padding:22px 24px 24px;">'
      + '    <div style="padding:16px;border-radius:16px;background:#f8fbff;border:1px solid ' + theme.border + ';">'
      + '      <div style="font:700 13px/1.4 Inter, sans-serif;color:#334155;">' + text.accessCodeLabel + '</div>'
      + '      <div style="margin-top:8px;display:flex;align-items:center;gap:10px;">'
      + '        <div id="bundle-success-code" style="flex:1;min-width:0;padding:12px 14px;border-radius:14px;background:#fff;border:1px solid ' + theme.border + ';font:700 18px/1.4 ui-monospace, monospace;color:#0f172a;letter-spacing:.04em;word-break:break-all;">' + escapeHtml(accessCode) + '</div>'
      + '        <button type="button" id="bundle-success-copy" style="border:none;background:' + theme.accent + ';color:#fff;border-radius:999px;min-width:92px;height:42px;padding:0 16px;font:700 14px/1 Inter, sans-serif;cursor:pointer;">' + text.copy + '</button>'
      + '      </div>'
      + (orderNumber
          ? '      <div style="margin-top:10px;padding:10px 12px;border-radius:12px;background:#fff;border:1px solid ' + theme.border + ';font:600 13px/1.6 Inter, sans-serif;color:#334155;">' + text.orderNoLabel + ': <span style="font-family:ui-monospace, monospace;color:#0f172a;">' + escapeHtml(orderNumber) + '</span></div>'
          : '')
      + (purchaseTime
          ? '      <div style="margin-top:10px;padding:10px 12px;border-radius:12px;background:#fff;border:1px solid ' + theme.border + ';font:600 13px/1.6 Inter, sans-serif;color:#334155;">' + text.purchaseTimeLabel + ': <span style="color:#0f172a;">' + escapeHtml(purchaseTime) + '</span></div>'
          : '')
      + '    </div>'
           + buildSuccessDownloadsHtml('cognote', text, 'cognote', settings)
      + '    <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:18px;">'
      + '      <button type="button" id="bundle-success-close" style="border:1px solid ' + theme.border + ';background:#f8fbff;color:#0f172a;border-radius:999px;min-width:120px;height:44px;padding:0 18px;font:700 14px/1 Inter, sans-serif;cursor:pointer;">' + text.useLater + '</button>'
      + '      <button type="button" id="bundle-success-use" style="border:none;background:' + theme.accent + ';color:#fff;border-radius:999px;min-width:120px;height:44px;padding:0 18px;font:700 14px/1 Inter, sans-serif;cursor:pointer;box-shadow:0 10px 24px rgba(121,173,220,.28);">' + text.useNow + '</button>'
      + '    </div>'
      + '  </div>'
      + '</div>';

    document.body.appendChild(modal);
    return modal;
  }

  function renderFretlabSuccessModal(root, lang, accessCode, text, theme, orderData, options) {
    const settings = options || {};
    const orderNumber = getOrderNumber(orderData);
    const purchaseTime = formatPurchaseTime(orderData, lang);
    const successTitle = settings.successTitle || text.successTitle;
    const modal = document.createElement('div');
    modal.id = 'bundle-success-modal';
    modal.style.cssText = [
      'position:fixed',
      'inset:0',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:20px',
      'background:' + theme.overlay,
      'z-index:10026'
    ].join(';');

    modal.innerHTML = ''
      + '<div style="width:min(92vw,540px);background:linear-gradient(180deg,#fffef8,#fff);border-radius:18px;padding:24px;border:2px dashed rgba(31,41,55,.32);box-shadow:0 24px 54px rgba(0,0,0,.25);transform:rotate(-0.2deg);">'
      + '  <div style="text-align:center;">'
      + '    <div style="display:flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:999px;background:#fef3c7;border:2px dashed rgba(217,119,6,.42);margin:0 auto 12px;font-size:28px;color:#b45309;">✓</div>'
      + '    <h3 style="margin:0;font:700 30px/1.2 ' + HAND_FONT + ';color:#111827;">' + escapeHtml(successTitle) + '</h3>'
      + '  </div>'
      + '  <div style="margin-top:16px;padding:14px;background:#fff;border:1px dashed rgba(17,24,39,.24);border-radius:14px;">'
      + '    <div style="font:700 15px/1.4 ' + HAND_FONT + ';color:#374151;">' + text.accessCodeLabel + '</div>'
      + '    <div style="margin-top:8px;display:flex;align-items:center;gap:10px;">'
      + '      <div id="bundle-success-code" style="flex:1;min-width:0;padding:12px 14px;border-radius:12px;background:#fff;border:1px dashed #9ca3af;font:800 18px/1.4 ui-monospace, monospace;color:#0f172a;letter-spacing:.04em;word-break:break-all;">' + escapeHtml(accessCode) + '</div>'
      + '      <button type="button" id="bundle-success-copy" style="border:2px solid rgba(17,24,39,.85);background:#fbbf24;color:#111827;border-radius:10px;min-width:92px;height:42px;padding:0 16px;font:700 14px/1 ' + HAND_FONT + ';cursor:pointer;">' + text.copy + '</button>'
      + '    </div>'
      + (orderNumber
          ? '    <div style="margin-top:10px;padding:10px 12px;border-radius:12px;background:#fffdf7;border:1px dashed rgba(17,24,39,.18);font:700 13px/1.6 ' + HAND_FONT + ';color:#374151;">' + text.orderNoLabel + '：<span style="font-family:ui-monospace, monospace;color:#111827;">' + escapeHtml(orderNumber) + '</span></div>'
          : '')
      + (purchaseTime
          ? '    <div style="margin-top:10px;padding:10px 12px;border-radius:12px;background:#fffdf7;border:1px dashed rgba(17,24,39,.18);font:700 13px/1.6 ' + HAND_FONT + ';color:#374151;">' + text.purchaseTimeLabel + '：<span style="color:#111827;">' + escapeHtml(purchaseTime) + '</span></div>'
          : '')
      + '  </div>'
           + buildSuccessDownloadsHtml('fretlab', text, 'fretlab', settings)
      + '  <div style="display:flex;justify-content:flex-end;margin-top:18px;">'
      + '    <button type="button" id="bundle-success-close" style="border:2px dashed rgba(17,24,39,.28);background:#fff;color:#111827;border-radius:10px;min-width:120px;height:42px;padding:0 18px;font:700 14px/1 ' + HAND_FONT + ';cursor:pointer;">' + text.close + '</button>'
      + '  </div>'
      + '</div>';

    document.body.appendChild(modal);
    return modal;
  }

  async function startPayment(root, method) {
    const lang = getLang(root);
    const text = I18N[lang];
    const productName = getProductName(root, lang);
    const payType = method === 'wechat' ? 'wxpay' : 'alipay';

    if (CONFIG.mockPaymentSuccess) {
      showToast(root, text.paymentBackendPending, false);
      showSuccessModal(root, lang, generateMockCode(), {
        out_trade_no: 'MOCK-' + Date.now(),
        money: CONFIG.amount,
        mock: true
      });
      return;
    }

    if (!CONFIG.api.createPayment || !CONFIG.api.checkOrder) {
      showToast(root, text.missingPaymentApi, true);
      return;
    }

    showLoading(root, text.createOrder);

    try {
      const response = await fetch(CONFIG.api.createPayment, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productName,
          money: CONFIG.amount,
          type: payType,
          tool_id: CONFIG.toolId
        })
      });
      const result = await response.json();
      if (!response.ok || !(result && (result.ok === true || result.success === true))) {
        throw new Error((result && (result.msg || result.message)) || text.networkError);
      }

      hideLoading();
      renderPaymentModal(root, lang, payType, result);
    } catch (error) {
      hideLoading();
      showToast(root, error.message || text.networkError, true);
    }
  }

  async function verifyCode(root) {
    const lang = getLang(root);
    const text = I18N[lang];
    const input = root.querySelector('[data-bundle-access-input]');
    const result = root.querySelector('[data-bundle-verify-result]');
    const code = input ? String(input.value || '').trim().toUpperCase() : '';

    if (!/^[A-Z0-9]{6,30}$/.test(code)) {
      if (result) result.textContent = text.invalidCode;
      showToast(root, text.invalidCode, true);
      return;
    }

    if (!CONFIG.api.verifyCode) {
      if (result) result.textContent = text.missingVerifyApi;
      showToast(root, text.missingVerifyApi, true);
      return;
    }

    if (result) result.textContent = text.checkingOrder;

    try {
      const response = await fetch(CONFIG.api.verifyCode, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_code: code,
          tool_id: CONFIG.toolId
        })
      });
      const payload = await response.json();
      const data = payload && payload.data ? payload.data : payload;
      if (!response.ok || !(data && (data.valid === true || data.ok === true || data.success === true))) {
        throw new Error((data && (data.msg || data.message)) || text.verifyFailed);
      }
      persistBundleAccess(code, {
        verifiedAt: Date.now(),
        product_name: data.product_name,
        amount: data.amount,
        order: data
      });
      if (result) result.textContent = text.verifyUnlocked;
      showSuccessModal(root, lang, code, data);
      showToast(root, text.verifySuccess, false);
    } catch (error) {
      if (result) result.textContent = error.message || text.verifyFailed;
      showToast(root, error.message || text.verifyFailed, true);
    }
  }

  function showSuccessModal(root, lang, accessCode, orderData) {
    const text = I18N[lang];
    const theme = getTheme(root);
    const themeName = getThemeName(root);
    persistBundleAccess(accessCode, {
      verifiedAt: Date.now(),
      product_name: (orderData && orderData.product_name) || getProductName(root, lang),
      amount: (orderData && orderData.money) || CONFIG.amount,
      order: orderData || null
    });
    removeNode('bundle-success-modal');

    const modal = themeName === 'fretlab'
      ? renderFretlabSuccessModal(root, lang, accessCode, text, theme, orderData)
      : renderCognoteSuccessModal(root, lang, accessCode, text, theme, orderData);
    bindSuccessModal(root, text, themeName, accessCode, modal);
  }

  function showProductSuccessModal(root, lang, accessCode, orderData, options) {
    const text = I18N[lang];
    const theme = getTheme(root);
    const themeName = getThemeName(root);
    removeNode('bundle-success-modal');

    const modal = themeName === 'fretlab'
      ? renderFretlabSuccessModal(root, lang, accessCode, text, theme, orderData, options)
      : renderCognoteSuccessModal(root, lang, accessCode, text, theme, orderData, options);
    bindSuccessModal(root, text, themeName, accessCode, modal);
  }

  function bindSuccessModal(root, text, themeName, accessCode, modal) {
    const copyBtn = byId('bundle-success-copy');
    const closeBtn = byId('bundle-success-close');
    const useBtn = byId('bundle-success-use');
    const switcher = byId('bundle-download-switcher');
    const switchButtons = Array.prototype.slice.call(document.querySelectorAll('.bundle-download-switch-btn'));
    const downloadButtons = Array.prototype.slice.call(document.querySelectorAll('.bundle-success-download-btn'));

    function syncDownloadPanels(activeTool) {
      ['cognote', 'fretlab'].forEach(function(tool) {
        const panel = byId('bundle-download-panel-' + tool);
        if (panel) panel.style.display = tool === activeTool ? 'grid' : 'none';
      });
      switchButtons.forEach(function(button) {
        const isActive = button.getAttribute('data-bundle-switch-tool') === activeTool;
        if (themeName === 'fretlab') {
          button.style.background = isActive ? '#fbbf24' : '#fff';
          button.style.color = '#111827';
          button.style.borderColor = isActive ? 'rgba(17,24,39,.85)' : 'rgba(17,24,39,.28)';
        } else {
          button.style.background = isActive ? '#79addc' : '#fff';
          button.style.color = isActive ? '#fff' : '#475569';
          button.style.borderColor = isActive ? '#79addc' : '#cbd5e1';
        }
      });
      if (switcher) switcher.dataset.activeTool = activeTool;
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', function() {
        navigator.clipboard.writeText(accessCode).then(function() {
          copyBtn.textContent = text.copied;
          window.setTimeout(function() {
            copyBtn.textContent = text.copy;
          }, 1600);
        }).catch(function() {});
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        modal.remove();
      });
    }

    if (useBtn) {
      useBtn.addEventListener('click', function() {
        const lang = getLang(root);
        const startUrl = themeName === 'fretlab'
          ? (lang === 'zh' ? '/fretlab-tool/' : '/en/fretlab-tool/')
          : (lang === 'zh' ? '/tools/melody-generator.html' : '/en/tools/melody-generator.html');
        modal.remove();
        window.location.href = startUrl;
      });
    }

    if (switcher) {
      switcher.addEventListener('click', function(event) {
        const button = event.target && event.target.closest ? event.target.closest('[data-bundle-switch-tool]') : null;
        if (!button) return;
        syncDownloadPanels(button.getAttribute('data-bundle-switch-tool'));
      });
      syncDownloadPanels(switcher.dataset.activeTool || (themeName === 'fretlab' ? 'fretlab' : 'cognote'));
    }

    downloadButtons.forEach(function(button) {
      button.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        const url = button.getAttribute('data-url') || '';
        if (!canStartDownload(url)) {
          return;
        }
        if (!triggerDownload(url)) {
          showToast(root, text.downloadUnavailable, true);
          return;
        }
        showToast(root, text.downloadStarted, false);
      });
    });

    modal.addEventListener('click', function(event) {
      if (event.target === modal) modal.remove();
    });
  }

  function initOffer(root) {
    if (!root || root.dataset.bundleInit === '1') return;
    root.dataset.bundleInit = '1';
  }

  function bindDelegatedEvents() {
    if (document.documentElement.dataset.bundlePaymentDelegatedBound === '1') return;

    document.addEventListener('click', function(event) {
      const payTrigger = event.target && event.target.closest
        ? event.target.closest('[data-bundle-pay-trigger]')
        : null;
      if (payTrigger) {
        const root = payTrigger.closest('[data-bundle-offer]');
        if (root) {
          event.preventDefault();
          startPayment(root, payTrigger.getAttribute('data-bundle-pay-trigger'));
          return;
        }
      }

      const verifyTrigger = event.target && event.target.closest
        ? event.target.closest('[data-bundle-verify-btn]')
        : null;
      if (!verifyTrigger) return;

      const root = verifyTrigger.closest('[data-bundle-offer]');
      if (!root) return;

      event.preventDefault();
      verifyCode(root);
    }, true);

    document.addEventListener('keydown', function(event) {
      if (event.key !== 'Enter') return;

      const input = event.target && event.target.closest
        ? event.target.closest('[data-bundle-access-input]')
        : null;
      if (!input) return;

      const root = input.closest('[data-bundle-offer]');
      if (!root) return;

      event.preventDefault();
      verifyCode(root);
    }, true);

    document.documentElement.dataset.bundlePaymentDelegatedBound = '1';
  }

  function init() {
    document.querySelectorAll('[data-bundle-offer]').forEach(initOffer);
    bindDelegatedEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.BundlePayment = {
    init: init,
    startPayment: startPayment,
    verifyCode: verifyCode,
    showSuccessModal: showSuccessModal,
    showProductSuccessModal: showProductSuccessModal,
    readLicense: readLicense,
    persistBundleAccess: persistBundleAccess,
    clearBundleAccess: clearBundleAccess
  };
})();
