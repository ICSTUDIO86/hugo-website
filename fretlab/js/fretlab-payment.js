/**
 * FretLab-only payment, order lookup, refund, and access verification frontend.
 *
 * Independence goals:
 * 1) No shared runtime dependency with Cognote scripts.
 * 2) Own localStorage namespace.
 * 3) Own API configuration entry.
 *
 * Runtime override example:
 * window.FRETLAB_PAYMENT_CONFIG = {
 *   amount: '48.00',
 *   downloads: {
 *     windows_x64: 'https://your-cdn/FretLab-win-x64.exe',
 *     mac_arm64: 'https://your-cdn/FretLab-mac-arm64.dmg',
 *     mac_x64: 'https://your-cdn/FretLab-mac-x64.dmg',
 *     linux_amd64: 'https://your-cdn/FretLab-linux-amd64.deb'
 *   },
 *   api: {
 *     createPayment: 'https://your-fretlab-api/createPayment',
 *     checkOrder: 'https://your-fretlab-api/checkOrder',
 *     verifyCode: 'https://your-fretlab-api/verifyCode',
 *     lookupOrder: 'https://your-fretlab-api/findAccessCodeByOrderNo',
 *     refundByAccessCode: 'https://your-fretlab-api/refundByAccessCode'
 *   }
 * };
 */
(function() {
  'use strict';

  const DEFAULT_CONFIG = {
    toolId: 'fretlab',
    productName: 'IC Fretboard Lab',
    amount: '48.00',
    // Temporary preview mode: click pay -> simulate paid -> show success popup.
    // Set to false (or override via window.FRETLAB_PAYMENT_CONFIG) when real payment is ready.
    mockPaymentSuccess: true,
    startUrl: '/fretlab-tool/',
    storageKey: 'ic-fretlab-license-v1',
    legacyCodeKey: 'ic-fretlab-access',
    legacySingleStorageKey: 'ic-single-product-access',
    downloads: {
      windows_x64: '',
      mac_arm64: '',
      mac_x64: '',
      linux_amd64: ''
    },
    downloadSizes: {
      windows_x64: '',
      mac_arm64: '',
      mac_x64: '',
      linux_amd64: ''
    },
    api: {
      // Dedicated FretLab backend endpoints. Do NOT point these to Cognote backend.
      createPayment: '/api/fretlab/payment/create',
      checkOrder: '/api/fretlab/payment/check',
      verifyCode: '/api/fretlab/access/verify',
      lookupOrder: '/api/fretlab/order/lookup',
      refundByAccessCode: '/api/fretlab/refund/access-code'
    }
  };

  const runtimeConfig = window.FRETLAB_PAYMENT_CONFIG || {};
  const CONFIG = {
    ...DEFAULT_CONFIG,
    ...runtimeConfig,
    downloads: {
      ...DEFAULT_CONFIG.downloads,
      ...(runtimeConfig.downloads || {})
    },
    downloadSizes: {
      ...DEFAULT_CONFIG.downloadSizes,
      ...(runtimeConfig.downloadSizes || {})
    },
    api: {
      ...DEFAULT_CONFIG.api,
      ...(runtimeConfig.api || {})
    }
  };

  const DEFAULT_BUNDLE_API = {
    verifyCode: 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/verifyBundleAccessCode',
    lookupOrder: 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/findBundleAccessCodeByOrderNo',
    refundByAccessCode: 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/refundBundleByAccessCode'
  };
  const COGNOTE_DOWNLOADS = {
    windows_x64: 'https://636c-cloud1-4g1r5ho01a0cfd85-1377702774.tcb.qcloud.la/downloads/Cognote-1.0.0-win-x64-setup.exe',
    mac_arm64: 'https://636c-cloud1-4g1r5ho01a0cfd85-1377702774.tcb.qcloud.la/downloads/Cognote-1.0.0-mac-arm64.dmg',
    mac_x64: 'https://636c-cloud1-4g1r5ho01a0cfd85-1377702774.tcb.qcloud.la/downloads/Cognote-1.0.0-mac-x64.dmg',
    linux_amd64: 'https://636c-cloud1-4g1r5ho01a0cfd85-1377702774.tcb.qcloud.la/downloads/Cognote-1.0.0-linux-amd64.deb'
  };

  const FRETLAB_TOOL_IDS = new Set(['fretlab', 'freaklab']);
  const BUNDLE_TOOL_ID = 'bundle';
  const STATE = {
    polling: null,
    creatingPayment: false,
    observer: null,
    langObserver: null
  };
  const HAND_FONT = '"Patrick Hand", "Kalam", "Xiaolai SC", "PingFang SC", "Microsoft YaHei", cursive';
  const I18N = {
    zh: {
      featureOrderLookup: '找回订单',
      featureRefund: '退款',
      endpointMissing: 'FretLab {feature} 接口未配置',
      lookupEnterOrder: '❌ 请输入订单号',
      lookupInvalidOrder: '❌ 请输入有效订单号（商家订单号或支付订单号）',
      lookupLoading: '🔄 正在查询...',
      lookupSuccessTitle: '🎉 找回成功',
      accessCodeLabel: '访问码',
      copyAccessCode: '复制访问码',
      accessCodeCopied: '访问码已复制',
      copyFailed: '复制失败，请手动复制',
      lookupNotFound: '未找到订单记录',
      lookupFailedPrefix: '❌ 查询失败：',
      networkError: '网络错误',
      lookupDialogTitle: '通过订单号找回访问码',
      orderNumberLabel: '订单号',
      lookupInputPlaceholder: '例如 IFL17722136740273437 或 20-32位数字支付订单号',
      usageTitle: '📋 使用说明',
      merchantOrderTip: '• 商家订单号：支付后生成，例如 IFL17722136740273437',
      paymentOrderTip: '• 支付订单号：支付宝/微信账单中的 20-32 位数字订单号',
      cancel: '取消',
      featurePay: '支付',
      createOrderLoading: '正在创建支付订单...',
      paymentConsentText: '我已阅读并同意',
      paymentTermsLink: '《用户协议》',
      paymentPrivacyLink: '《隐私政策》',
      paymentConsentRequired: '请先勾选并同意用户协议与隐私政策，再继续支付。',
      paymentConsentReady: '已同意条款，现在可以扫码或打开支付页面完成支付。',
      termsDialogTitle: '用户协议',
      privacyDialogTitle: '隐私政策',
      dialogClose: '关闭',
      lookupAction: '🔎 查找访问码',
      successTitle: '支付成功',
      successDesc: '访问码已生成，输入或复制后即可解锁完整版。',
      orderNoLabel: '订单号',
      orderNoCopied: '订单号已复制',
      copyShort: '复制',
      copiedShort: '已复制',
      laterUse: '稍后使用',
      startNow: '立即使用',
      mockBadge: '模拟支付预览',
      mockPayToast: '模拟支付完成，已展示成功弹窗',
      mockVerifyReady: '检测到模拟支付已完成，访问码已生成',
      verifyUnlockedReady: '已解锁完整版，可直接进入工具使用',
      verifyDetectedExisting: '检测到已解锁访问码，可直接进入完整版',
      verifyInvalidInput: '请输入有效访问码',
      verifyChecking: '正在验证访问码...',
      verifySuccess: '访问码验证成功，完整版已解锁',
      verifyInvalidOrWrongTool: '访问码无效或不属于 FretLab',
      verifyFailed: '验证失败，请稍后重试',
      downloadSectionTitle: '下载安装包',
      downloadClickHint: '点击下方平台按钮即可下载',
      downloadSectionTip: '下载完成后，输入上面的访问码即可解锁桌面版。',
      bundleDownloadSectionTip: '选择 Cognote 或 FretLab，即可查看对应的桌面版安装包。',
      bundleDownloadToolCognote: 'Cognote',
      bundleDownloadToolFretlab: 'FretLab',
      downloadWindows: 'Windows 安装版',
      downloadMacArm: 'macOS Apple Silicon',
      downloadMacIntel: 'macOS Intel',
      downloadLinux: 'Linux AMD64 DEB',
      downloadAction: '点击下载',
      downloadNotReady: '未配置',
      downloadUnavailable: '该平台安装包暂未配置',
      downloadStarted: '已开始下载，请查看浏览器下载列表',
      bundleExtraDownloadTitle: '套装额外下载',
      bundleExtraDownloadTip: '这次解锁的是 Cognote + FretLab。除了 FretLab，你也可以直接下载 Cognote 桌面版。',
      downloadCognoteDesktop: '下载 Cognote 桌面版',
      refundDialogTitle: '申请退款',
      refundCodeLabel: '访问码 *',
      refundInputPlaceholder: '输入访问码（6-30位大写字母或数字）',
      refundNoticeTitle: '⚠️ 退款须知',
      refundNoticeLine1: '• 退款通常在 1-3 个工作日内到账',
      refundNoticeLine2: '• 退款成功后访问码会立即失效',
      refundNoticeLine3: '• 每个访问码仅可申请一次退款',
      refundSubmit: '提交退款',
      refundEnterValidCode: '❌ 请输入有效访问码',
      refundSubmitting: '🔄 正在提交退款申请...',
      refundAccepted: '✅ 退款申请已受理',
      refundSubmittedToast: '退款申请已提交',
      refundFailed: '退款申请失败',
      networkErrorPrefix: '❌ 网络错误：',
      retryLater: '请稍后重试'
    },
    en: {
      featureOrderLookup: 'order lookup',
      featureRefund: 'refund',
      endpointMissing: 'FretLab {feature} endpoint is not configured',
      lookupEnterOrder: '❌ Please enter your order number',
      lookupInvalidOrder: '❌ Please enter a valid merchant order number or payment order number',
      lookupLoading: '🔄 Looking up...',
      lookupSuccessTitle: '🎉 Access code found',
      accessCodeLabel: 'Access code',
      copyAccessCode: 'Copy access code',
      accessCodeCopied: 'Access code copied',
      copyFailed: 'Copy failed, please copy it manually',
      lookupNotFound: 'Order record not found',
      lookupFailedPrefix: '❌ Lookup failed: ',
      networkError: 'Network error',
      lookupDialogTitle: 'Recover access code by order number',
      orderNumberLabel: 'Order number',
      lookupInputPlaceholder: 'e.g. IFL17722136740273437 or a 20-32 digit payment order number',
      usageTitle: '📋 Notes',
      merchantOrderTip: '• Merchant order number: generated after payment, e.g. IFL17722136740273437',
      paymentOrderTip: '• Payment order number: 20-32 digits in Alipay/WeChat bill',
      cancel: 'Cancel',
      featurePay: 'payment',
      createOrderLoading: 'Creating payment order...',
      paymentConsentText: 'I have read and agree to the',
      paymentTermsLink: 'User Agreement',
      paymentPrivacyLink: 'Privacy Policy',
      paymentConsentRequired: 'Please agree to the User Agreement and Privacy Policy before continuing to payment.',
      paymentConsentReady: 'Agreement confirmed. You can now scan the code or open the payment page.',
      termsDialogTitle: 'User Agreement',
      privacyDialogTitle: 'Privacy Policy',
      dialogClose: 'Close',
      lookupAction: '🔎 Find access code',
      successTitle: 'Payment Successful',
      successDesc: 'Access code is ready. Enter or copy it to unlock full version.',
      orderNoLabel: 'Order number',
      orderNoCopied: 'Order number copied',
      copyShort: 'Copy',
      copiedShort: 'Copied',
      laterUse: 'Later',
      startNow: 'Open Tool',
      mockBadge: 'Mock payment preview',
      mockPayToast: 'Mock payment completed, success popup shown',
      mockVerifyReady: 'Mock payment completed, access code generated',
      verifyUnlockedReady: 'Full version unlocked. You can open the tool now.',
      verifyDetectedExisting: 'Unlocked access code detected. Full version is ready.',
      verifyInvalidInput: 'Please enter a valid access code',
      verifyChecking: 'Verifying access code...',
      verifySuccess: 'Access code verified. Full version unlocked.',
      verifyInvalidOrWrongTool: 'Access code is invalid or does not belong to FretLab',
      verifyFailed: 'Verification failed. Please try again later',
      downloadSectionTitle: 'Download Installers',
      downloadClickHint: 'Click a platform button below to download',
      downloadSectionTip: 'After download, use the access code above to unlock the desktop version.',
      bundleDownloadSectionTip: 'Choose Cognote or FretLab above to view the desktop installers for each tool.',
      bundleDownloadToolCognote: 'Cognote',
      bundleDownloadToolFretlab: 'FretLab',
      downloadWindows: 'Windows Installer',
      downloadMacArm: 'macOS Apple Silicon',
      downloadMacIntel: 'macOS Intel',
      downloadLinux: 'Linux AMD64 DEB',
      downloadAction: 'Click to download',
      downloadNotReady: 'Not configured',
      downloadUnavailable: 'Installer for this platform is not configured yet',
      downloadStarted: 'Download started. Check your browser downloads',
      bundleExtraDownloadTitle: 'Bundle extra download',
      bundleExtraDownloadTip: 'This bundle unlocks both Cognote and FretLab. Besides FretLab, you can also download the Cognote desktop build here.',
      downloadCognoteDesktop: 'Download Cognote desktop',
      refundDialogTitle: 'Request refund',
      refundCodeLabel: 'Access code *',
      refundInputPlaceholder: 'Enter access code (6-30 uppercase letters or numbers)',
      refundNoticeTitle: '⚠️ Refund notes',
      refundNoticeLine1: '• Refund usually arrives within 1-3 business days',
      refundNoticeLine2: '• Access code is invalidated immediately after refund',
      refundNoticeLine3: '• Each access code can request refund only once',
      refundSubmit: 'Submit refund',
      refundEnterValidCode: '❌ Please enter a valid access code',
      refundSubmitting: '🔄 Submitting refund request...',
      refundAccepted: '✅ Refund request accepted',
      refundSubmittedToast: 'Refund request submitted',
      refundFailed: 'Refund request failed',
      networkErrorPrefix: '❌ Network error: ',
      retryLater: 'Please try again later'
    }
  };

  function isZhLang() {
    const htmlLang = (document.documentElement && document.documentElement.lang) || '';
    const navLang = navigator.language || '';
    const lang = String(htmlLang || navLang).toLowerCase();
    return lang.indexOf('zh') === 0;
  }

  function i18n(key, vars) {
    const dict = isZhLang() ? I18N.zh : I18N.en;
    let text = dict[key] || key;
    if (vars && typeof vars === 'object') {
      Object.keys(vars).forEach(function(name) {
        text = text.replace(new RegExp('\\{' + name + '\\}', 'g'), String(vars[name]));
      });
    }
    return text;
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function showToast(message, type) {
    const toast = document.createElement('div');
    const bg = type === 'error' ? '#b91c1c' : type === 'success' ? '#166534' : '#1f2937';
    toast.style.cssText = [
      'position: fixed',
      'bottom: 20px',
      'left: 50%',
      'transform: translateX(-50%)',
      'max-width: min(92vw, 560px)',
      'background: ' + bg,
      'color: #fff',
      'padding: 10px 14px',
      'border-radius: 12px',
      'border: 2px dashed rgba(255,255,255,.45)',
      'font-family: ' + HAND_FONT,
      'font-size: 14px',
      'line-height: 1.45',
      'text-align: center',
      'z-index: 10050',
      'box-shadow: 0 10px 30px rgba(0,0,0,.28)'
    ].join(';');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() {
      toast.remove();
    }, 2600);
  }

  function parseJsonStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function writeJsonStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function readFretlabLicense() {
    return parseJsonStorage(CONFIG.storageKey, null);
  }

  function writeFretlabLicense(payload) {
    const safePayload = {
      version: 1,
      toolId: CONFIG.toolId,
      code: payload.code,
      verifiedAt: payload.verifiedAt || Date.now(),
      order: payload.order || null
    };
    writeJsonStorage(CONFIG.storageKey, safePayload);

    // Keep one legacy direct key only for old pages/tools reading this key.
    localStorage.setItem(CONFIG.legacyCodeKey, safePayload.code);
  }

  function extractFromLegacySingleStorage() {
    const data = parseJsonStorage(CONFIG.legacySingleStorageKey, { version: 1, tools: {} });
    if (!data || !data.tools || typeof data.tools !== 'object') {
      return null;
    }

    const entries = Object.entries(data.tools);
    for (const [toolId, payload] of entries) {
      const normalized = String(toolId || '').toLowerCase();
      if ((FRETLAB_TOOL_IDS.has(normalized) || normalized.includes('fret')) && payload && payload.code) {
        return {
          version: 1,
          toolId: CONFIG.toolId,
          code: String(payload.code).toUpperCase(),
          verifiedAt: payload.verifiedAt || Date.now(),
          order: payload.order || null
        };
      }
    }
    return null;
  }

  function migrateLegacyIfNeeded() {
    const current = readFretlabLicense();
    if (current && current.code) {
      return current;
    }

    const fromSingle = extractFromLegacySingleStorage();
    if (fromSingle && fromSingle.code) {
      writeFretlabLicense(fromSingle);
      return fromSingle;
    }

    try {
      const legacyCode = localStorage.getItem(CONFIG.legacyCodeKey);
      if (legacyCode && legacyCode.trim()) {
        const migrated = {
          version: 1,
          toolId: CONFIG.toolId,
          code: legacyCode.trim().toUpperCase(),
          verifiedAt: Date.now(),
          order: null
        };
        writeFretlabLicense(migrated);
        return migrated;
      }
    } catch (_) {
      // ignore
    }

    return null;
  }

  function storeAccess(accessCode, orderInfo) {
    writeFretlabLicense({
      code: accessCode,
      verifiedAt: Date.now(),
      order: orderInfo || null
    });
  }

  function getStoredAccess() {
    const current = readFretlabLicense();
    if (current && current.code) {
      return current;
    }
    return migrateLegacyIfNeeded();
  }

  function hasAccess() {
    const access = getStoredAccess();
    return Boolean(access && access.code);
  }

  function isBundleAccessCode(accessCode) {
    return /^BDL[A-Z0-9]{3,27}$/i.test(String(accessCode || '').trim());
  }

  function isBundleOrderNumber(orderNumber) {
    return /^IBD\d{10,24}$/i.test(String(orderNumber || '').trim());
  }

  function shouldFallbackToBundleLookup(result) {
    if (!result || result.success) return false;
    return result.code === 'ORDER_NOT_FOUND' || /未找到|not found/i.test(result.error || result.message || '');
  }

  function getBundleEndpoint(name) {
    const runtimeBundleApi = window.IC_BUNDLE_PAYMENT_CONFIG && window.IC_BUNDLE_PAYMENT_CONFIG.api
      ? window.IC_BUNDLE_PAYMENT_CONFIG.api
      : null;
    const raw = runtimeBundleApi && runtimeBundleApi[name]
      ? runtimeBundleApi[name]
      : DEFAULT_BUNDLE_API[name];
    return String(raw || '').trim();
  }

  function persistBundleAccess(accessCode, payload) {
    if (window.BundlePayment && typeof window.BundlePayment.persistBundleAccess === 'function') {
      window.BundlePayment.persistBundleAccess(accessCode, payload || {});
      return;
    }

    const safeCode = String(accessCode || '').trim().toUpperCase();
    if (!safeCode) return;

    localStorage.setItem('ic-bundle-license-v1', JSON.stringify({
      version: 1,
      toolId: BUNDLE_TOOL_ID,
      code: safeCode,
      verifiedAt: Date.now(),
      order: payload && payload.order ? payload.order : null,
      unlockTools: ['cognote', 'fretlab']
    }));

    try {
      const now = Date.now();
      localStorage.setItem('ic_full_version', 'true');
      localStorage.setItem('ic_verified_from_access_page', 'true');
      localStorage.setItem('ic_verified_timestamp', String(now));
      localStorage.setItem('ic-studio-payment-state', JSON.stringify({
        hasPaid: true,
        accessCode: safeCode,
        paidAt: new Date(now).toISOString(),
        orderInfo: payload && payload.order ? payload.order : null,
        version: 'bundle-1'
      }));
      localStorage.setItem('ic-premium-access', JSON.stringify({
        code: safeCode,
        activatedAt: now,
        deviceId: 'bundle',
        features: ['sight-reading-tool', 'fretlab-tool'],
        version: 'bundle-1',
        serverVerified: true,
        productName: (payload && payload.product_name) || 'IC Studio Bundle',
        amount: (payload && payload.amount) || '168.00',
        orderInfo: payload && payload.order ? payload.order : null
      }));
    } catch (_) {
      // ignore
    }

    storeAccess(safeCode, payload && payload.order ? payload.order : null);
  }

  function clearBundleAccess() {
    if (window.BundlePayment && typeof window.BundlePayment.clearBundleAccess === 'function') {
      window.BundlePayment.clearBundleAccess();
      return;
    }

    try {
      localStorage.removeItem('ic_full_version');
      localStorage.removeItem('ic_verified_from_access_page');
      localStorage.removeItem('ic_verified_timestamp');
      localStorage.removeItem('ic-studio-payment-state');
      localStorage.removeItem('ic-premium-access');
      localStorage.removeItem('ic-bundle-license-v1');
      localStorage.removeItem(CONFIG.storageKey);
      localStorage.removeItem(CONFIG.legacyCodeKey);
    } catch (_) {
      // ignore
    }
  }

  function setVerifyMessage(html) {
    const result = byId('verify-result');
    if (!result) return;
    result.innerHTML = html;
  }

  function normalizeToolId(toolId) {
    return String(toolId || '').toLowerCase().trim();
  }

  function isCurrentToolCode(toolId) {
    const normalized = normalizeToolId(toolId);
    return normalized === BUNDLE_TOOL_ID || FRETLAB_TOOL_IDS.has(normalized) || normalized.indexOf('fret') >= 0;
  }

  function getEndpoint(name) {
    const raw = CONFIG.api ? CONFIG.api[name] : '';
    if (!raw) return '';
    if (Array.isArray(raw)) {
      const first = raw.find(function(item) {
        return Boolean(String(item || '').trim());
      });
      return first ? String(first).trim() : '';
    }
    return String(raw).trim();
  }

  function ensureEndpoint(name, featureName) {
    const endpoint = getEndpoint(name);
    if (!endpoint) {
      showToast(i18n('endpointMissing', { feature: featureName }), 'error');
      return '';
    }
    return endpoint;
  }

  async function parseResponse(response) {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (_) {
      return { ok: false, msg: '接口返回了非 JSON 内容', raw: text.slice(0, 180) };
    }
  }

  function getErrorMessage(result, fallback) {
    return (
      (result && (result.msg || result.message || result.error)) ||
      fallback ||
      '请求失败'
    );
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getDownloadPlatforms() {
    return [
      { key: 'windows_x64', icon: '💻', label: i18n('downloadWindows') },
      { key: 'mac_arm64', icon: '🍎', label: i18n('downloadMacArm') },
      { key: 'mac_x64', icon: '🍎', label: i18n('downloadMacIntel') },
      { key: 'linux_amd64', icon: '🐧', label: i18n('downloadLinux') }
    ];
  }

  function withDownloadSize(platformKey, label) {
    return label;
  }

  function getRecommendedPlatformKey() {
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const source = (ua + ' ' + platform).toLowerCase();

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

  function getRecommendedCognoteDownloadUrl() {
    const platformKey = getRecommendedPlatformKey();
    return String(COGNOTE_DOWNLOADS[platformKey] || '').trim();
  }

  function getToolDownloads(tool) {
    if (tool === 'cognote') {
      return { ...COGNOTE_DOWNLOADS };
    }

    return CONFIG.downloads || {};
  }

  function triggerDirectDownload(url) {
    if (!url) return false;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }

  function renderDownloadButtonsHtml(tool) {
    const downloads = getToolDownloads(tool || 'fretlab');
    return getDownloadPlatforms().map(function(item) {
      const url = String((downloads && downloads[item.key]) || '').trim();
      const enabled = Boolean(url);
      const buttonLabel = withDownloadSize(item.key, item.icon + ' ' + item.label);
      return ''
        + '<button type="button" class="fretlab-download-btn" data-platform="' + item.key + '" data-url="' + escapeHtml(url) + '"'
        + ' style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;margin:0;padding:10px 12px;border-radius:10px;font-family:' + HAND_FONT + ';font-size:14px;line-height:1.35;'
        + (enabled
            ? 'border:2px solid rgba(17,24,39,.85);background:#fff;color:#111827;cursor:pointer;box-shadow:0 2px 0 rgba(17,24,39,.18);'
            : 'border:1px dashed rgba(148,163,184,.45);background:#f8fafc;color:#94a3b8;cursor:not-allowed;')
        + '">'
        + '<span style="font-size:15px;font-weight:700;">' + escapeHtml(buttonLabel) + '</span>'
        + '<span aria-hidden="true" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:999px;transform:rotate(-7deg);'
        + (enabled
            ? 'border:2px dashed rgba(17,24,39,.62);background:#fef3c7;color:#111827;'
            : 'border:1.5px dashed rgba(148,163,184,.6);background:#e5e7eb;color:#9ca3af;')
        + '">'
        + '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="display:block;">'
        + '<path d="M8 2.3 L8 9.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'
        + '<path d="M4.8 7.8 Q 6.1 9.3 8 10.8 Q 9.9 9.3 11.2 7.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>'
        + '<path d="M2.8 13 Q 8 12.1 13.2 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'
        + '</svg>'
        + '</span>'
        + '</button>';
    }).join('');
  }

  function renderBundleDownloadSectionHtml() {
    return ''
      + '<div style="font-size:21px;line-height:1.15;color:#92400e;margin-bottom:8px;text-align:center;">' + i18n('downloadSectionTitle') + '</div>'
      + '<div data-fretlab-download-switcher data-active-tool="fretlab" style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:12px;">'
      + '  <button type="button" data-fretlab-download-tool="cognote" style="display:inline-flex;align-items:center;justify-content:center;min-width:118px;height:40px;padding:0 16px;border-radius:999px;border:2px dashed rgba(17,24,39,.28);background:#fff;color:#374151;font:700 14px/1 ' + HAND_FONT + ';cursor:pointer;transition:all .18s ease;">' + i18n('bundleDownloadToolCognote') + '</button>'
      + '  <button type="button" data-fretlab-download-tool="fretlab" style="display:inline-flex;align-items:center;justify-content:center;min-width:118px;height:40px;padding:0 16px;border-radius:999px;border:2px dashed rgba(17,24,39,.85);background:#fbbf24;color:#111827;font:700 14px/1 ' + HAND_FONT + ';cursor:pointer;transition:all .18s ease;">' + i18n('bundleDownloadToolFretlab') + '</button>'
      + '</div>'
      + '<div data-fretlab-download-panel="fretlab" style="display:grid;grid-template-columns:1fr;gap:12px;margin-top:12px;">' + renderDownloadButtonsHtml('fretlab') + '</div>'
      + '<div data-fretlab-download-panel="cognote" style="display:none;grid-template-columns:1fr;gap:12px;margin-top:12px;">' + renderDownloadButtonsHtml('cognote') + '</div>';
  }

  function setButtonLoading(button, loading) {
    if (!button) return;
    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent || '';
    }
    if (loading) {
      button.disabled = true;
      button.style.opacity = '0.72';
      button.style.cursor = 'wait';
      button.textContent = '处理中...';
    } else {
      button.disabled = false;
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
      button.textContent = button.dataset.originalText || button.textContent;
    }
  }

  function setPaymentButtonLoading(method, loading) {
    const id = method === 'wechat' ? 'fretlab-buy-wechat' : 'fretlab-buy-alipay';
    const button = byId(id);
    setButtonLoading(button, loading);
  }

  function showPaymentLoading(message) {
    hidePaymentLoading();

    const overlay = document.createElement('div');
    overlay.id = 'fretlab-payment-loading';
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'background:rgba(17,24,39,.52)',
      'z-index:10030',
      'padding:20px'
    ].join(';');

    const card = document.createElement('div');
    card.style.cssText = [
      'width:min(92vw,320px)',
      'background:#fff',
      'border:1px solid rgba(37,99,235,.14)',
      'border-radius:18px',
      'padding:24px 22px',
      'text-align:center',
      'box-shadow:0 20px 44px rgba(15,23,42,.18)'
    ].join(';');

    card.innerHTML = ''
      + '<div style="width:42px;height:42px;margin:0 auto 14px;border:3px solid rgba(148,163,184,.25);border-top-color:#2563eb;border-radius:999px;animation:fretlab-pay-spin 1s linear infinite;"></div>'
      + '<div style="font:600 16px/1.4 Inter, sans-serif;color:#0f172a;">' + escapeHtml(message) + '</div>';

    if (!byId('fretlab-payment-loading-style')) {
      const style = document.createElement('style');
      style.id = 'fretlab-payment-loading-style';
      style.textContent = '@keyframes fretlab-pay-spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(style);
    }

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  function hidePaymentLoading() {
    const overlay = byId('fretlab-payment-loading');
    if (overlay) overlay.remove();
  }

  function showPaymentUnavailable(message) {
    setVerifyMessage('<span style="color:#dc2626;">❌ ' + message + '</span>');
    showToast(message, 'error');
  }

  function generateMockOrderNo() {
    const now = Date.now();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return 'ICMOCK' + String(now) + String(rand);
  }

  function generateMockAccessCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = 'FL';
    for (let i = 0; i < 10; i += 1) {
      out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
  }

  function closePaymentModal() {
    const modal = byId('fretlab-payment-modal');
    if (modal) modal.remove();
  }

  function closePolicyModal() {
    const modal = byId('fretlab-policy-modal');
    if (modal) modal.remove();
  }

  function renderPolicyBody(kind) {
    const zh = isZhLang();
    if (kind === 'terms') {
      return zh
        ? ''
          + '<p style="margin:0 0 14px;">欢迎使用 <strong>IC Fretboard Lab</strong>（以下简称“FretLab”或“本产品”）。本协议是您与本产品开发者之间具有约束力的协议。请您在购买、验证访问码或使用本产品前仔细阅读并确认同意以下内容。</p>'
          + '<h4 style="margin:18px 0 8px;font-size:22px;color:#111827;">1. 服务说明</h4>'
          + '<p style="margin:0 0 12px;">FretLab 是面向音乐学习者的指板训练与音乐理解工具，提供在线页面、桌面安装包及相关付费功能。产品会持续更新，功能和内容可能根据开发进度调整。</p>'
          + '<h4 style="margin:18px 0 8px;font-size:22px;color:#111827;">2. 使用规范</h4>'
          + '<p style="margin:0 0 12px;">您不得以违法、侵权、破解、反向工程、批量分发、公开传播或其他不当方式使用本产品，也不得将其用于未经授权的商业用途。</p>'
          + '<h4 style="margin:18px 0 8px;font-size:22px;color:#111827;">3. 访问码与付费功能</h4>'
          + '<p style="margin:0 0 12px;">支付成功后，您将获得对应访问码或解锁资格，具体以页面说明和订单信息为准。访问码仅限正常授权范围内使用。</p>'
          + '<p style="margin:0 0 12px;">若开发者发现访问码存在滥用、公开发布、私自售卖、倒卖、异常传播或其他违反本协议的情形，开发者有权暂停、禁用或撤销对应访问码及相关服务，不另行赔偿。</p>'
          + '<h4 style="margin:18px 0 8px;font-size:22px;color:#111827;">4. 退款与服务调整</h4>'
          + '<p style="margin:0 0 12px;">退款规则以支付页面和退款页面说明为准。退款成功后，对应访问码会失效，开发者有权同步撤销相关解锁权限。</p>'
          + '<h4 style="margin:18px 0 8px;font-size:22px;color:#111827;">5. 免责声明</h4>'
          + '<p style="margin:0 0 12px;">本产品按“现状”提供，开发者不对特定学习结果、训练效果、兼容性或持续无故障运行作出保证。</p>'
          + '<p style="margin:18px 0 0;text-align:center;font-size:14px;color:#6b7280;">最后更新日期：2026 年 3 月 16 日</p>'
        : ''
          + '<p style="margin:0 0 14px;">Welcome to <strong>IC Fretboard Lab</strong> (“FretLab”). This agreement governs your purchase, access-code verification, and use of the product.</p>'
          + '<h4 style="margin:18px 0 8px;font-size:22px;color:#111827;">1. Service</h4>'
          + '<p style="margin:0 0 12px;">FretLab is a fretboard-training and music-learning tool that may include web pages, desktop installers, and paid features. Features may change as the product evolves.</p>'
          + '<h4 style="margin:18px 0 8px;font-size:22px;color:#111827;">2. Acceptable Use</h4>'
          + '<p style="margin:0 0 12px;">You may not use the product for illegal, abusive, infringing, reverse-engineering, redistribution, or otherwise unauthorized purposes.</p>'
          + '<h4 style="margin:18px 0 8px;font-size:22px;color:#111827;">3. Access Codes</h4>'
          + '<p style="margin:0 0 12px;">After payment, you receive the corresponding access code or unlock entitlement. Access codes are limited to normal authorized use.</p>'
          + '<p style="margin:0 0 12px;">If an access code is abused, publicly posted, privately resold, redistributed, or otherwise misused, the developer reserves the right to disable that code and related service access without compensation.</p>'
          + '<h4 style="margin:18px 0 8px;font-size:22px;color:#111827;">4. Refunds</h4>'
          + '<p style="margin:0 0 12px;">Refund policy follows the payment and refund pages. Once refunded, the corresponding access code becomes invalid.</p>'
          + '<h4 style="margin:18px 0 8px;font-size:22px;color:#111827;">5. Disclaimer</h4>'
          + '<p style="margin:0 0 12px;">The product is provided “as is” without guarantees of specific learning outcomes or uninterrupted service.</p>'
          + '<p style="margin:18px 0 0;text-align:center;font-size:14px;color:#6b7280;">Last updated: March 16, 2026</p>';
    }

    return zh
      ? ''
        + '<p style="margin:0 0 14px;"><strong>IC Fretboard Lab</strong>（以下简称“FretLab”或“本产品”）重视您的隐私。本政策说明我们如何收集、使用和保护与订单、访问码及服务运行相关的信息。</p>'
        + '<h4 style="margin:18px 0 8px;font-size:22px;color:#111827;">1. 收集的信息</h4>'
        + '<p style="margin:0 0 12px;">为完成支付、生成访问码、处理退款和订单找回，我们可能收集订单号、支付流水号、支付方式及必要的交易信息。</p>'
        + '<h4 style="margin:18px 0 8px;font-size:22px;color:#111827;">2. 信息用途</h4>'
        + '<p style="margin:0 0 12px;">这些信息将用于完成支付、验证授权、处理售后支持、退款、风控判断与产品改进。</p>'
        + '<h4 style="margin:18px 0 8px;font-size:22px;color:#111827;">3. 信息存储与共享</h4>'
        + '<p style="margin:0 0 12px;">订单、访问码及相关服务数据主要存储在腾讯云 CloudBase 环境中。仅在支付和服务必要范围内与相关支付服务提供方共享必要信息。</p>'
        + '<h4 style="margin:18px 0 8px;font-size:22px;color:#111827;">4. 风控与滥用处理</h4>'
        + '<p style="margin:0 0 12px;">为防止访问码被公开发布、私自售卖、倒卖、批量传播或其他滥用行为，我们可能基于订单信息、验证记录和退款记录进行风险判断。确认违规后，开发者有权禁用相关访问码。</p>'
        + '<h4 style="margin:18px 0 8px;font-size:22px;color:#111827;">5. 用户权利</h4>'
        + '<p style="margin:0 0 12px;">如需咨询订单、访问码或数据处理问题，可联系：<code>service@icstudio.club</code>。</p>'
        + '<p style="margin:18px 0 0;text-align:center;font-size:14px;color:#6b7280;">最后更新日期：2026 年 3 月 16 日</p>'
      : ''
        + '<p style="margin:0 0 14px;"><strong>IC Fretboard Lab</strong> respects your privacy. This policy explains how order, payment, access-code, and service data may be collected and used.</p>'
        + '<h4 style="margin:18px 0 8px;font-size:22px;color:#111827;">1. Information Collected</h4>'
        + '<p style="margin:0 0 12px;">We may collect order numbers, payment transaction numbers, payment method, and other necessary transaction data to complete payment, refunds, and access-code delivery.</p>'
        + '<h4 style="margin:18px 0 8px;font-size:22px;color:#111827;">2. Use of Information</h4>'
        + '<p style="margin:0 0 12px;">Data is used for payment completion, license verification, support, refund handling, risk control, and product improvement.</p>'
        + '<h4 style="margin:18px 0 8px;font-size:22px;color:#111827;">3. Storage and Sharing</h4>'
        + '<p style="margin:0 0 12px;">Service data is primarily stored in Tencent Cloud CloudBase. Necessary payment information may be shared with payment providers only as required to deliver the service.</p>'
        + '<h4 style="margin:18px 0 8px;font-size:22px;color:#111827;">4. Abuse Prevention</h4>'
        + '<p style="margin:0 0 12px;">To prevent access codes from being publicly posted, privately resold, redistributed, or otherwise abused, the developer may review order, verification, and refund records. Confirmed abuse may result in code deactivation.</p>'
        + '<h4 style="margin:18px 0 8px;font-size:22px;color:#111827;">5. Contact</h4>'
        + '<p style="margin:0 0 12px;">For questions about orders, access codes, or data handling, contact <code>service@icstudio.club</code>.</p>'
        + '<p style="margin:18px 0 0;text-align:center;font-size:14px;color:#6b7280;">Last updated: March 16, 2026</p>';
  }

  function showPolicyDialog(kind) {
    closePolicyModal();
    const title = kind === 'terms' ? i18n('termsDialogTitle') : i18n('privacyDialogTitle');
    const accent = kind === 'terms' ? '#2563eb' : '#16a34a';
    const modal = document.createElement('div');
    modal.id = 'fretlab-policy-modal';
    modal.innerHTML = ''
      + '<div style="position:fixed;inset:0;background:rgba(17,24,39,.72);z-index:10090;display:flex;align-items:center;justify-content:center;padding:24px;padding-bottom:max(24px,env(safe-area-inset-bottom));-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;">'
      + '  <div style="position:relative;display:flex;flex-direction:column;width:min(720px,100%);max-height:min(84vh,900px);background:#fff;border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.28);overflow:hidden;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;">'
      + '    <div style="padding:18px 20px;background:' + accent + ';color:#fff;flex:0 0 auto;">'
      + '      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">'
      + '        <div style="font-size:18px;line-height:1.35;color:#fff;font-weight:700;letter-spacing:.01em;">' + escapeHtml(title) + '</div>'
      + '        <button type="button" id="fretlab-policy-close" style="border:none;background:rgba(255,255,255,.16);color:#fff;border-radius:999px;width:36px;height:36px;cursor:pointer;font-size:20px;line-height:1;display:flex;align-items:center;justify-content:center;">×</button>'
      + '      </div>'
      + '    </div>'
      + '    <div style="flex:1 1 auto;min-height:0;overflow-y:auto;padding:22px 24px 18px;font-size:16px;line-height:1.75;color:#374151;background:#fff;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;">'
      +        renderPolicyBody(kind)
      + '    </div>'
      + '    <div style="display:flex;justify-content:flex-end;padding:16px 24px calc(20px + env(safe-area-inset-bottom));border-top:1px solid #e5e7eb;background:#fff;flex:0 0 auto;">'
      + '      <button type="button" id="fretlab-policy-confirm" style="border:none;background:#f3f4f6;color:#111827;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:14px;font-weight:600;">' + i18n('dialogClose') + '</button>'
      + '    </div>'
      + '  </div>'
      + '</div>';
    document.body.appendChild(modal);

    ['fretlab-policy-close', 'fretlab-policy-confirm'].forEach(function(id) {
      const element = byId(id);
      if (element) {
        element.addEventListener('click', closePolicyModal);
      }
    });

    modal.firstElementChild.addEventListener('click', function(event) {
      if (event.target === modal.firstElementChild) closePolicyModal();
    });
  }

  function renderPaymentModal(paymentData, method) {
    closePaymentModal();
    const methodLabel = method === 'wxpay' ? '微信支付' : '支付宝支付';
    const accent = method === 'wxpay' ? '#16a34a' : '#2563eb';
    const paymentBodyHtml = paymentData.img
      ? '<img src="' + paymentData.img + '" alt="支付二维码" style="width:180px;height:180px;border-radius:10px;border:1px solid #e5e7eb;" />'
      : paymentData.payurl
        ? '<a href="' + paymentData.payurl + '" target="_blank" rel="noopener" style="display:inline-block;background:' + accent + ';color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600;">打开支付页面</a>'
        : '<div style="font-size:13px;color:#6b7280;">未获取到支付二维码，请稍后重试</div>';

    const modal = document.createElement('div');
    modal.id = 'fretlab-payment-modal';
    modal.innerHTML = ''
      + '<div style="position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:10040;display:flex;align-items:center;justify-content:center;padding:20px;">'
      + '  <div style="width:min(460px,100%);background:#fff;border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.28);overflow:hidden;">'
      + '    <div style="padding:18px 20px;background:' + accent + ';color:#fff;">'
      + '      <div style="font-size:18px;font-weight:700;">' + methodLabel + '</div>'
      + '      <div style="margin-top:6px;font-size:13px;opacity:.95;">订单号：' + (paymentData.out_trade_no || '暂无') + '</div>'
      + '      <div style="margin-top:4px;font-size:13px;opacity:.95;">金额：¥' + (paymentData.order_info && paymentData.order_info.money ? paymentData.order_info.money : CONFIG.amount) + '</div>'
      + '    </div>'
      + '    <div style="padding:18px 20px;">'
      + '      <div style="margin-bottom:14px;padding:14px 16px;background:#f8fafc;border:1px solid #dbeafe;border-radius:12px;color:#334155;font-size:14px;line-height:1.7;">'
      + '        <label for="fretlab-payment-terms-checkbox" style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;">'
      + '          <input type="checkbox" id="fretlab-payment-terms-checkbox" style="margin-top:2px;transform:scale(1.15);accent-color:' + accent + ';" />'
      + '          <span>'
      + i18n('paymentConsentText')
      + ' <a href="#" id="fretlab-open-terms" style="color:' + accent + ';text-decoration:none;font-weight:600;">'
      + i18n('paymentTermsLink')
      + '</a> '
      + (isZhLang() ? '和' : 'and the')
      + ' <a href="#" id="fretlab-open-privacy" style="color:' + accent + ';text-decoration:none;font-weight:600;">'
      + i18n('paymentPrivacyLink')
      + '</a>'
      + '          </span>'
      + '        </label>'
      + '      </div>'
      + '      <div id="fretlab-pay-qr" style="display:none;justify-content:center;min-height:190px;align-items:center;">'
      + paymentBodyHtml
      + '      </div>'
      + '      <div id="fretlab-payment-status" style="margin-top:14px;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;color:#334155;">'
      + i18n('paymentConsentRequired')
      + '</div>'
      + '      <div style="margin-top:14px;display:flex;justify-content:flex-end;">'
      + '        <button type="button" id="fretlab-close-pay-modal" style="border:none;background:#f3f4f6;color:#111827;border-radius:8px;padding:8px 12px;cursor:pointer;">' + i18n('dialogClose') + '</button>'
      + '      </div>'
      + '    </div>'
      + '  </div>'
      + '</div>';
    document.body.appendChild(modal);

    const closeBtn = byId('fretlab-close-pay-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', closePaymentModal);
    }
    const termsLink = byId('fretlab-open-terms');
    if (termsLink) {
      termsLink.addEventListener('click', function(event) {
        event.preventDefault();
        showPolicyDialog('terms');
      });
    }
    const privacyLink = byId('fretlab-open-privacy');
    if (privacyLink) {
      privacyLink.addEventListener('click', function(event) {
        event.preventDefault();
        showPolicyDialog('privacy');
      });
    }
    const consentCheckbox = byId('fretlab-payment-terms-checkbox');
    const qrSection = byId('fretlab-pay-qr');
    if (consentCheckbox && qrSection) {
      consentCheckbox.addEventListener('change', function() {
        const agreed = !!consentCheckbox.checked;
        qrSection.style.display = agreed ? 'flex' : 'none';
        if (agreed) {
          updatePaymentStatus('✅ ' + i18n('paymentConsentReady'));
          if (paymentData && paymentData.out_trade_no) {
            startPolling(paymentData.out_trade_no);
          }
        } else {
          stopPolling();
          updatePaymentStatus(i18n('paymentConsentRequired'), true);
        }
      });
    }
    modal.firstElementChild.addEventListener('click', function(event) {
      if (event.target === modal.firstElementChild) closePaymentModal();
    });
  }

  function updatePaymentStatus(text, isError) {
    const status = byId('fretlab-payment-status');
    if (!status) return;
    status.textContent = text;
    status.style.color = isError ? '#dc2626' : '#334155';
  }

  function showSuccessPopup(accessCode, orderInfo) {
    const orderNumber = (
      (orderInfo && orderInfo.order_info && orderInfo.order_info.out_trade_no) ||
      (orderInfo && orderInfo.out_trade_no) ||
      '暂无'
    );

    const popup = document.createElement('div');
    const showBundleExtras = isBundleAccessCode(accessCode);
    popup.id = 'fretlab-success-popup';
    popup.innerHTML = ''
      + '<div style="position:fixed;inset:0;background:rgba(26,26,26,.66);backdrop-filter:blur(2px);z-index:10060;display:flex;align-items:center;justify-content:center;padding:20px;">'
      + '  <div style="width:min(560px,100%);background:linear-gradient(180deg,#fffef8,#fff);border-radius:18px;padding:24px;border:2px dashed rgba(31,41,55,.35);box-shadow:0 24px 60px rgba(0,0,0,.28);font-family:' + HAND_FONT + ';transform:rotate(-0.2deg);">'
      + '    <div style="text-align:center;">'
      + '      <div style="display:flex;align-items:center;justify-content:center;gap:10px;">'
      + '        <div style="width:48px;height:48px;border-radius:999px;border:2px dashed rgba(22,163,74,.6);background:#dcfce7;color:#166534;display:inline-flex;align-items:center;justify-content:center;font-size:26px;line-height:1;">✓</div>'
      + '        <h3 style="margin:0;font-size:28px;line-height:1.2;color:#111827;font-family:' + HAND_FONT + ';">' + i18n('successTitle') + '</h3>'
      + '      </div>'
      + '    </div>'
      + '    <div style="margin-top:16px;padding:14px;background:#fff;border:1px dashed rgba(17,24,39,.24);border-radius:12px;">'
      + '      <div style="display:flex;align-items:center;gap:10px;width:100%;">'
      + '        <span style="flex:1;min-width:0;font-family:monospace;font-size:18px;font-weight:800;padding:10px 12px;border:1px dashed #9ca3af;border-radius:10px;background:#fff;line-height:1.1;letter-spacing:.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + accessCode + '</span>'
      + '        <button type="button" id="fretlab-copy-code" style="border:1px solid rgba(17,24,39,.5);background:#f9fafb;color:#111827;border-radius:8px;padding:8px 12px;cursor:pointer;font-family:' + HAND_FONT + ';">' + i18n('copyShort') + '</button>'
      + '      </div>'
      + '      <div style="display:flex;align-items:center;gap:10px;width:100%;margin-top:10px;">'
      + '        <span style="flex:1;min-width:0;font-family:monospace;font-size:16px;font-weight:700;padding:9px 12px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + i18n('orderNoLabel') + '：' + orderNumber + '</span>'
      + '        <button type="button" id="fretlab-copy-order" style="border:1px solid rgba(17,24,39,.5);background:#f9fafb;color:#111827;border-radius:8px;padding:8px 12px;cursor:pointer;font-family:' + HAND_FONT + ';">' + i18n('copyShort') + '</button>'
      + '      </div>'
      + '      <div style="margin-top:12px;padding:12px;background:#fffbeb;border:1px dashed rgba(217,119,6,.38);border-radius:10px;">'
      + (showBundleExtras
          ? renderBundleDownloadSectionHtml()
          : '<div style="font-size:21px;line-height:1.15;color:#92400e;margin-bottom:8px;text-align:center;">' + i18n('downloadSectionTitle') + '</div>'
            + '<div style="display:grid;grid-template-columns:1fr;gap:12px;margin-top:4px;">' + renderDownloadButtonsHtml() + '</div>')
      + '      </div>'
      + '    </div>'
      + '    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">'
      + '      <button type="button" id="fretlab-close-success" style="border:2px dashed rgba(17,24,39,.32);background:#fff;color:#111827;border-radius:10px;padding:9px 14px;cursor:pointer;font-family:' + HAND_FONT + ';">' + i18n('laterUse') + '</button>'
      + '      <a href="' + CONFIG.startUrl + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;border:2px solid rgba(17,24,39,.9);background:#fbbf24;color:#111827;border-radius:10px;padding:9px 14px;text-decoration:none;font-family:' + HAND_FONT + ';">' + i18n('startNow') + '</a>'
      + '    </div>'
      + '  </div>'
      + '</div>';

    document.body.appendChild(popup);

    const close = byId('fretlab-close-success');
    if (close) {
      close.addEventListener('click', function() {
        popup.remove();
      });
    }
    popup.firstElementChild.addEventListener('click', function(event) {
      if (event.target === popup.firstElementChild) popup.remove();
    });

    const copy = byId('fretlab-copy-code');
    if (copy) {
      copy.addEventListener('click', function() {
        navigator.clipboard.writeText(accessCode).then(function() {
          showToast(i18n('accessCodeCopied'), 'success');
          copy.textContent = i18n('copiedShort');
          setTimeout(function() {
            copy.textContent = i18n('copyShort');
          }, 1400);
        }).catch(function() {
          showToast(i18n('copyFailed'), 'error');
        });
      });
    }

    const copyOrder = byId('fretlab-copy-order');
    if (copyOrder) {
      copyOrder.addEventListener('click', function() {
        navigator.clipboard.writeText(orderNumber).then(function() {
          showToast(i18n('orderNoCopied'), 'success');
          copyOrder.textContent = i18n('copiedShort');
          setTimeout(function() {
            copyOrder.textContent = i18n('copyShort');
          }, 1400);
        }).catch(function() {
          showToast(i18n('copyFailed'), 'error');
        });
      });
    }

    popup.querySelectorAll('.fretlab-download-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const url = String(btn.getAttribute('data-url') || '').trim();
        if (!url) {
          showToast(i18n('downloadUnavailable'), 'error');
          return;
        }

        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(i18n('downloadStarted'), 'success');
      });
    });

    const downloadSwitcher = popup.querySelector('[data-fretlab-download-switcher]');
    if (downloadSwitcher) {
      const switchButtons = Array.prototype.slice.call(popup.querySelectorAll('[data-fretlab-download-tool]'));
      const panels = Array.prototype.slice.call(popup.querySelectorAll('[data-fretlab-download-panel]'));
      const syncDownloadPanels = function(activeTool) {
        panels.forEach(function(panel) {
          panel.style.display = panel.getAttribute('data-fretlab-download-panel') === activeTool ? 'grid' : 'none';
        });
        switchButtons.forEach(function(button) {
          const isActive = button.getAttribute('data-fretlab-download-tool') === activeTool;
          button.style.background = isActive ? '#fbbf24' : '#fff';
          button.style.color = '#111827';
          button.style.borderColor = isActive ? 'rgba(17,24,39,.85)' : 'rgba(17,24,39,.28)';
        });
        downloadSwitcher.dataset.activeTool = activeTool;
      };

      downloadSwitcher.addEventListener('click', function(event) {
        const button = event.target && event.target.closest ? event.target.closest('[data-fretlab-download-tool]') : null;
        if (!button) return;
        syncDownloadPanels(button.getAttribute('data-fretlab-download-tool') || 'fretlab');
      });

      syncDownloadPanels(downloadSwitcher.dataset.activeTool || 'fretlab');
    }
  }

  async function startPayment(method) {
    if (STATE.creatingPayment) return;
    if (CONFIG.mockPaymentSuccess) {
      STATE.creatingPayment = true;
      setPaymentButtonLoading(method, true);
      showPaymentLoading(i18n('createOrderLoading'));
      try {
        await new Promise(function(resolve) { setTimeout(resolve, 480); });
        const outTradeNo = generateMockOrderNo();
        const accessCode = generateMockAccessCode();
        const orderInfo = {
          out_trade_no: outTradeNo,
          product_name: CONFIG.productName,
          mock: true,
          order_info: {
            out_trade_no: outTradeNo,
            money: CONFIG.amount,
            pay_type: method === 'wechat' ? 'wxpay' : 'alipay'
          }
        };
        storeAccess(accessCode, orderInfo);
        hidePaymentLoading();
        setVerifyMessage('<span style="color:#16a34a;">✅ ' + i18n('mockVerifyReady') + '</span>');
        showSuccessPopup(accessCode, orderInfo);
        showToast(i18n('mockPayToast'), 'success');
      } finally {
        hidePaymentLoading();
        STATE.creatingPayment = false;
        setPaymentButtonLoading(method, false);
      }
      return;
    }

    const endpoint = ensureEndpoint('createPayment', i18n('featurePay'));
    if (!endpoint) return;

    const payType = method === 'wechat' ? 'wxpay' : 'alipay';
    STATE.creatingPayment = true;
    setPaymentButtonLoading(method, true);
    showPaymentLoading(i18n('createOrderLoading'));

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: CONFIG.productName,
          money: CONFIG.amount,
          type: payType,
          tool_id: CONFIG.toolId
        })
      });
      const result = await parseResponse(response);
      if (!response.ok || !result.ok) {
        const backendMessage = getErrorMessage(result, '创建支付订单失败');
        const endpointNotReady = (
          response.status === 404 ||
          response.status === 405 ||
          /无效的工具类型/.test(backendMessage) ||
          /非 JSON/.test(backendMessage)
        );
        if (endpointNotReady) {
          throw new Error('FretLab 支付接口尚未就绪，请稍后再试或联系站点管理员配置独立 FretLab 后端。');
        }
        throw new Error(backendMessage);
      }

      hidePaymentLoading();
      renderPaymentModal(result, payType);
    } catch (error) {
      hidePaymentLoading();
      showPaymentUnavailable(error.message || '创建支付失败，请稍后重试');
    } finally {
      hidePaymentLoading();
      STATE.creatingPayment = false;
      setPaymentButtonLoading(method, false);
    }
  }

  function stopPolling() {
    if (STATE.polling) {
      clearInterval(STATE.polling);
      STATE.polling = null;
    }
  }

  function startPolling(outTradeNo) {
    const endpoint = ensureEndpoint('checkOrder', '订单查询');
    if (!endpoint || !outTradeNo) return;

    stopPolling();
    let attempts = 0;
    const maxAttempts = 120;

    STATE.polling = setInterval(async function() {
      attempts += 1;
      try {
        const requestUrl = endpoint + '?out_trade_no=' + encodeURIComponent(outTradeNo);
        const response = await fetch(requestUrl);
        const result = await parseResponse(response);

        if (result.ok && result.paid) {
          stopPolling();
          updatePaymentStatus('✅ 支付成功，正在生成访问码...');
          setTimeout(function() {
            closePaymentModal();
            if (result.access_code) {
              const orderInfo = {
                out_trade_no: outTradeNo,
                product_name: CONFIG.productName,
                amount: CONFIG.amount,
                order_info: result.order_info || null
              };
              storeAccess(result.access_code, orderInfo);
              setVerifyMessage('<span style="color:#16a34a;">✅ ' + i18n('verifyUnlockedReady') + '</span>');
              showSuccessPopup(result.access_code, orderInfo);
            } else {
              showToast('支付成功，访问码生成中，请稍后刷新', 'success');
            }
          }, 1400);
          return;
        }

        if (attempts >= maxAttempts) {
          stopPolling();
          updatePaymentStatus('⏰ 检测超时，请稍后手动刷新确认支付状态', true);
        }
      } catch (_) {
        if (attempts >= maxAttempts) {
          stopPolling();
          updatePaymentStatus('❌ 网络异常，请稍后重试', true);
        }
      }
    }, 3000);
  }

  function handleInputChange() {
    const input = byId('access-code-input');
    const button = byId('verify-btn');
    if (!input || !button) return;

    const code = String(input.value || '').trim().toUpperCase();
    const valid = code.length >= 10 && code.length <= 20 && /^[A-Z0-9]+$/.test(code);
    button.dataset.valid = valid ? 'true' : 'false';
    button.style.cursor = valid ? 'pointer' : 'not-allowed';
    button.style.opacity = valid ? '1' : '0.6';
  }

  async function verifyAccessCode() {
    const input = byId('access-code-input');
    const button = byId('verify-btn');
    if (!input || !button) return;

    const code = String(input.value || '').trim().toUpperCase();
    if (!code || button.dataset.valid !== 'true') {
      setVerifyMessage('<span style="color:#dc2626;">❌ ' + i18n('verifyInvalidInput') + '</span>');
      return;
    }

    button.disabled = true;
    setVerifyMessage('<span style="color:#2563eb;">🔄 ' + i18n('verifyChecking') + '</span>');

    try {
      const useBundle = isBundleAccessCode(code);
      const endpoint = useBundle
        ? getBundleEndpoint('verifyCode')
        : ensureEndpoint('verifyCode', '访问码验证');
      if (!endpoint) {
        throw new Error(i18n('verifyFailed'));
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_code: code })
      });
      const result = await parseResponse(response);

      if (response.ok && result.ok && result.valid && isCurrentToolCode(result.tool_id)) {
        const orderInfo = {
          out_trade_no: result.out_trade_no || null,
          product_name: result.product_name || CONFIG.productName,
          amount: result.amount || null,
          order_info: result.order_info || null
        };
        if (useBundle) {
          persistBundleAccess(code, {
            verifiedAt: Date.now(),
            product_name: result.product_name || 'IC Studio Bundle',
            amount: result.amount || null,
            order: orderInfo
          });
        } else {
          storeAccess(code, orderInfo);
        }
        setVerifyMessage('<span style="color:#16a34a;">✅ ' + i18n('verifySuccess') + '</span>');
        showSuccessPopup(code, orderInfo);
      } else {
        setVerifyMessage('<span style="color:#dc2626;">❌ ' + (result.msg || result.error || i18n('verifyInvalidOrWrongTool')) + '</span>');
      }
    } catch (error) {
      setVerifyMessage('<span style="color:#dc2626;">❌ ' + (error.message || i18n('verifyFailed')) + '</span>');
    } finally {
      button.disabled = false;
    }
  }

  function closeLookupDialog() {
    const dialog = byId('fretlab-order-lookup-dialog');
    if (dialog) dialog.remove();
  }

  async function performOrderLookup() {
    const input = byId('fretlab-order-lookup-input');
    const resultDiv = byId('fretlab-order-lookup-result');
    if (!input || !resultDiv) return;

    const orderNumber = input.value.trim();
    if (!orderNumber) {
      resultDiv.innerHTML = '<div style="padding:8px 10px;border-radius:10px;background:#fef2f2;border:1px dashed #fca5a5;color:#b91c1c;">' + i18n('lookupEnterOrder') + '</div>';
      return;
    }

    const isMerchantOrder = /^(IFL|IC|ICS)\d{10,24}$/i.test(orderNumber) || /^ICMOCK\d{10,24}$/i.test(orderNumber) || isBundleOrderNumber(orderNumber);
    const isTradeNo = /^\d{20,32}$/.test(orderNumber);
    if (!isMerchantOrder && !isTradeNo) {
      resultDiv.innerHTML = '<div style="padding:8px 10px;border-radius:10px;background:#fef2f2;border:1px dashed #fca5a5;color:#b91c1c;">' + i18n('lookupInvalidOrder') + '</div>';
      return;
    }

    resultDiv.innerHTML = '<div style="padding:8px 10px;border-radius:10px;background:#eff6ff;border:1px dashed #93c5fd;color:#1d4ed8;">' + i18n('lookupLoading') + '</div>';

    try {
      const useBundle = isBundleOrderNumber(orderNumber);
      const body = isMerchantOrder
        ? { order_no: orderNumber, tool_id: useBundle ? BUNDLE_TOOL_ID : CONFIG.toolId }
        : { zpay_trade_no: orderNumber, tool_id: useBundle ? BUNDLE_TOOL_ID : CONFIG.toolId };

      let result;
      let response;

      if (useBundle) {
        const endpoint = getBundleEndpoint('lookupOrder');
        if (!endpoint) {
          throw new Error(i18n('lookupNotFound'));
        }
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        result = await parseResponse(response);
      } else {
        const endpoint = ensureEndpoint('lookupOrder', i18n('featureOrderLookup'));
        if (!endpoint) {
          throw new Error(i18n('lookupNotFound'));
        }
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        result = await parseResponse(response);

        if ((!response.ok || !result.success) && shouldFallbackToBundleLookup(result)) {
          const bundleEndpoint = getBundleEndpoint('lookupOrder');
          if (bundleEndpoint) {
            const bundleResponse = await fetch(bundleEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...body,
                tool_id: BUNDLE_TOOL_ID
              })
            });
            const bundleResult = await parseResponse(bundleResponse);
            response = bundleResponse;
            result = bundleResult;
          }
        }
      }

      if (response.ok && result && result.success && result.result && result.result.access_code) {
        const accessCode = String(result.result.access_code).toUpperCase();
        const safeAccessCode = escapeHtml(accessCode);
        resultDiv.innerHTML = ''
          + '<div style="background:#f0fdf4;border:1px dashed #86efac;border-radius:12px;padding:12px;">'
          + '  <div style="color:#166534;font-weight:700;margin-bottom:8px;">' + i18n('lookupSuccessTitle') + '</div>'
          + '  <div style="margin-bottom:8px;">' + i18n('accessCodeLabel') + '：<code style="padding:2px 6px;background:#fff;border:1px dashed #9ca3af;border-radius:6px;">' + safeAccessCode + '</code></div>'
          + '  <button id="fretlab-lookup-copy-btn" type="button" style="border:1px solid #166534;background:#22c55e;color:#052e16;padding:6px 10px;border-radius:8px;cursor:pointer;font-family:' + HAND_FONT + ';">' + i18n('copyAccessCode') + '</button>'
          + '</div>';

        const copyBtn = byId('fretlab-lookup-copy-btn');
        if (copyBtn) {
          copyBtn.addEventListener('click', function() {
            navigator.clipboard.writeText(accessCode).then(function() {
              showToast(i18n('accessCodeCopied'), 'success');
            }).catch(function() {
              showToast(i18n('copyFailed'), 'error');
            });
          });
        }
      } else {
        resultDiv.innerHTML = '<div style="padding:8px 10px;border-radius:10px;background:#fffbeb;border:1px dashed #fcd34d;color:#b45309;">⚠️ ' + escapeHtml(result.error || result.message || i18n('lookupNotFound')) + '</div>';
      }
    } catch (error) {
      resultDiv.innerHTML = '<div style="padding:8px 10px;border-radius:10px;background:#fef2f2;border:1px dashed #fca5a5;color:#b91c1c;">' + i18n('lookupFailedPrefix') + escapeHtml(error.message || i18n('networkError')) + '</div>';
    }
  }

  function showOrderLookupDialog() {
    closeLookupDialog();

    const dialog = document.createElement('div');
    dialog.id = 'fretlab-order-lookup-dialog';
    dialog.innerHTML = ''
      + '<div style="position:fixed;inset:0;background:rgba(26,26,26,.62);backdrop-filter:blur(2px);z-index:10070;display:flex;align-items:center;justify-content:center;padding:20px;">'
      + '  <div style="width:min(560px,100%);background:linear-gradient(180deg,#fffef8,#fff);border-radius:18px;padding:24px;border:2px dashed rgba(31,41,55,.35);box-shadow:0 24px 54px rgba(0,0,0,.25);font-family:' + HAND_FONT + ';transform:rotate(-0.25deg);">'
      + '    <h3 style="margin:0;color:#111827;font-size:28px;line-height:1.25;text-align:center;font-family:' + HAND_FONT + ';">' + i18n('lookupDialogTitle') + '</h3>'
      + '    <label for="fretlab-order-lookup-input" style="display:block;color:#1f2937;font-size:16px;margin-bottom:6px;">' + i18n('orderNumberLabel') + '</label>'
      + '    <input id="fretlab-order-lookup-input" type="text" placeholder="' + i18n('lookupInputPlaceholder') + '" style="width:100%;padding:12px 14px;border:2px dashed rgba(17,24,39,.32);border-radius:12px;box-sizing:border-box;background:#fff;outline:none;font-size:15px;" />'
      + '    <div id="fretlab-order-lookup-result" style="margin-top:12px;min-height:24px;font-size:14px;"></div>'
      + '    <div style="margin-top:16px;padding:12px 14px;background:#fff;border:1px dashed rgba(17,24,39,.2);border-radius:12px;color:#374151;">'
      + '      <div style="font-size:16px;color:#111827;margin-bottom:4px;">' + i18n('usageTitle') + '</div>'
      + '      <div style="font-size:14px;line-height:1.55;">'
      + '        ' + i18n('merchantOrderTip') + '<br>'
      + '        ' + i18n('paymentOrderTip')
      + '      </div>'
      + '    </div>'
      + '    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">'
      + '      <button id="fretlab-order-lookup-cancel" type="button" style="border:2px dashed rgba(17,24,39,.28);background:#fff;padding:9px 14px;border-radius:12px;cursor:pointer;color:#111827;font-family:' + HAND_FONT + ';font-size:15px;">' + i18n('cancel') + '</button>'
      + '      <button id="fretlab-order-lookup-submit" type="button" style="border:2px solid rgba(17,24,39,.88);background:#f59e0b;color:#111827;padding:9px 16px;border-radius:12px;cursor:pointer;font-family:' + HAND_FONT + ';font-size:15px;">' + i18n('lookupAction') + '</button>'
      + '    </div>'
      + '  </div>'
      + '</div>';

    document.body.appendChild(dialog);

    const overlay = dialog.firstElementChild;
    const cancelBtn = byId('fretlab-order-lookup-cancel');
    const submitBtn = byId('fretlab-order-lookup-submit');
    const input = byId('fretlab-order-lookup-input');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeLookupDialog);
    }
    if (submitBtn) {
      submitBtn.addEventListener('click', performOrderLookup);
    }
    if (input) {
      input.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
          performOrderLookup();
        }
      });
      setTimeout(function() { input.focus(); }, 80);
    }
    if (overlay) {
      overlay.addEventListener('click', function(event) {
        if (event.target === overlay) closeLookupDialog();
      });
    }
  }

  function closeRefundDialog() {
    const dialog = byId('fretlab-refund-dialog');
    if (dialog) dialog.remove();
  }

  async function submitRefund() {
    const input = byId('fretlab-refund-input');
    const resultDiv = byId('fretlab-refund-result');
    const submitBtn = byId('fretlab-refund-submit');
    if (!input || !resultDiv || !submitBtn) return;

    const accessCode = input.value.trim().toUpperCase();
    if (!accessCode || !/^[A-Z0-9]{6,30}$/.test(accessCode)) {
      resultDiv.innerHTML = '<div style="padding:8px 10px;border-radius:10px;background:#fef2f2;border:1px dashed #fca5a5;color:#b91c1c;">' + i18n('refundEnterValidCode') + '</div>';
      return;
    }

    submitBtn.disabled = true;
    resultDiv.innerHTML = '<div style="padding:8px 10px;border-radius:10px;background:#eff6ff;border:1px dashed #93c5fd;color:#1d4ed8;">' + i18n('refundSubmitting') + '</div>';

    try {
      const useBundle = isBundleAccessCode(accessCode);
      const endpoint = useBundle
        ? getBundleEndpoint('refundByAccessCode')
        : ensureEndpoint('refundByAccessCode', i18n('featureRefund'));
      if (!endpoint) {
        throw new Error(i18n('refundFailed'));
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_code: accessCode,
          tool_id: useBundle ? BUNDLE_TOOL_ID : CONFIG.toolId
        })
      });
      const result = await parseResponse(response);

      if (response.ok && result && (result.success || result.ok)) {
        if (useBundle) {
          clearBundleAccess();
        }
        resultDiv.innerHTML = '<div style="padding:8px 10px;border-radius:10px;background:#f0fdf4;border:1px dashed #86efac;color:#166534;">' + i18n('refundAccepted') + '</div>';
        showToast(i18n('refundSubmittedToast'), 'success');
      } else {
        resultDiv.innerHTML = '<div style="padding:8px 10px;border-radius:10px;background:#fef2f2;border:1px dashed #fca5a5;color:#b91c1c;">❌ ' + (result.error || result.message || i18n('refundFailed')) + '</div>';
      }
    } catch (error) {
      resultDiv.innerHTML = '<div style="padding:8px 10px;border-radius:10px;background:#fef2f2;border:1px dashed #fca5a5;color:#b91c1c;">' + i18n('networkErrorPrefix') + (error.message || i18n('retryLater')) + '</div>';
    } finally {
      submitBtn.disabled = false;
    }
  }

  function showRefundDialog() {
    closeRefundDialog();

    const dialog = document.createElement('div');
    dialog.id = 'fretlab-refund-dialog';
    dialog.innerHTML = ''
      + '<div style="position:fixed;inset:0;background:rgba(26,26,26,.62);backdrop-filter:blur(2px);z-index:10080;display:flex;align-items:center;justify-content:center;padding:20px;">'
      + '  <div style="width:min(520px,100%);background:linear-gradient(180deg,#fffef8,#fff);border-radius:18px;padding:24px;border:2px dashed rgba(31,41,55,.35);box-shadow:0 24px 54px rgba(0,0,0,.25);font-family:' + HAND_FONT + ';transform:rotate(0.2deg);">'
      + '    <h3 style="margin:0;color:#111827;font-size:28px;line-height:1.25;text-align:center;font-family:' + HAND_FONT + ';">' + i18n('refundDialogTitle') + '</h3>'
      + '    <label for="fretlab-refund-input" style="display:block;color:#1f2937;font-size:16px;margin-bottom:6px;">' + i18n('refundCodeLabel') + '</label>'
      + '    <input id="fretlab-refund-input" type="text" maxlength="30" placeholder="' + i18n('refundInputPlaceholder') + '" style="width:100%;padding:12px 14px;border:2px dashed rgba(17,24,39,.32);border-radius:12px;box-sizing:border-box;background:#fff;outline:none;font-size:15px;text-transform:uppercase;" />'
      + '    <div id="fretlab-refund-result" style="margin-top:12px;min-height:24px;font-size:14px;"></div>'
      + '    <div style="margin-top:14px;padding:12px 14px;background:#fff;border:1px dashed rgba(220,38,38,.35);border-radius:12px;color:#374151;">'
      + '      <div style="font-size:16px;color:#991b1b;margin-bottom:4px;">' + i18n('refundNoticeTitle') + '</div>'
      + '      <div style="font-size:14px;line-height:1.55;">'
      + '        ' + i18n('refundNoticeLine1') + '<br>'
      + '        ' + i18n('refundNoticeLine2') + '<br>'
      + '        ' + i18n('refundNoticeLine3')
      + '      </div>'
      + '    </div>'
      + '    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">'
      + '      <button id="fretlab-refund-cancel" type="button" style="border:2px dashed rgba(17,24,39,.28);background:#fff;padding:9px 14px;border-radius:12px;cursor:pointer;color:#111827;font-family:' + HAND_FONT + ';font-size:15px;">' + i18n('cancel') + '</button>'
      + '      <button id="fretlab-refund-submit" type="button" style="border:2px solid rgba(127,29,29,.9);background:#ef4444;color:#fff;padding:9px 16px;border-radius:12px;cursor:pointer;font-family:' + HAND_FONT + ';font-size:15px;">' + i18n('refundSubmit') + '</button>'
      + '    </div>'
      + '  </div>'
      + '</div>';

    document.body.appendChild(dialog);

    const overlay = dialog.firstElementChild;
    const cancelBtn = byId('fretlab-refund-cancel');
    const submitBtn = byId('fretlab-refund-submit');
    const input = byId('fretlab-refund-input');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeRefundDialog);
    }
    if (submitBtn) {
      submitBtn.addEventListener('click', submitRefund);
    }
    if (input) {
      input.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
          submitRefund();
        }
      });
      setTimeout(function() { input.focus(); }, 80);
    }
    if (overlay) {
      overlay.addEventListener('click', function(event) {
        if (event.target === overlay) closeRefundDialog();
      });
    }
  }

  function bindDom() {
    const buyAli = byId('fretlab-buy-alipay');
    const buyWx = byId('fretlab-buy-wechat');
    const verifyBtn = byId('verify-btn');
    const accessInput = byId('access-code-input');
    const recoverBtn = byId('recover-access-code-btn');
    const refundBtn = byId('refund-btn');

    if (buyAli && !buyAli.dataset.bound) {
      buyAli.dataset.bound = '1';
      buyAli.addEventListener('click', function(event) {
        event.preventDefault();
        startPayment('alipay');
      });
    }
    if (buyWx && !buyWx.dataset.bound) {
      buyWx.dataset.bound = '1';
      buyWx.addEventListener('click', function(event) {
        event.preventDefault();
        startPayment('wechat');
      });
    }
    if (verifyBtn && !verifyBtn.dataset.bound) {
      verifyBtn.dataset.bound = '1';
      verifyBtn.addEventListener('click', function(event) {
        event.preventDefault();
        verifyAccessCode();
      });
    }
    if (accessInput && !accessInput.dataset.bound) {
      accessInput.dataset.bound = '1';
      accessInput.addEventListener('input', handleInputChange);
      accessInput.addEventListener('keyup', handleInputChange);
      accessInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
          verifyAccessCode();
        }
      });
      if (hasAccess()) {
        setVerifyMessage('<span style="color:#16a34a;">✅ ' + i18n('verifyDetectedExisting') + '</span>');
      }
      handleInputChange();
    }
    if (recoverBtn && !recoverBtn.dataset.bound) {
      recoverBtn.dataset.bound = '1';
      recoverBtn.addEventListener('click', function(event) {
        event.preventDefault();
        showOrderLookupDialog();
      });
    }
    if (refundBtn && !refundBtn.dataset.bound) {
      refundBtn.dataset.bound = '1';
      refundBtn.addEventListener('click', function(event) {
        event.preventDefault();
        showRefundDialog();
      });
    }
  }

  function syncVerifyDetectedMessageByLang() {
    const result = byId('verify-result');
    if (!result || !hasAccess()) {
      return;
    }

    const current = String(result.textContent || '').trim();
    const candidates = [
      I18N.zh.verifyDetectedExisting,
      I18N.en.verifyDetectedExisting,
      I18N.zh.verifyUnlockedReady,
      I18N.en.verifyUnlockedReady
    ];
    const shouldSync = !current || candidates.some(function(text) {
      return current.indexOf(text) >= 0;
    });
    if (shouldSync) {
      setVerifyMessage('<span style="color:#16a34a;">✅ ' + i18n('verifyDetectedExisting') + '</span>');
    }
  }

  function observeDomChanges() {
    if (STATE.observer || typeof MutationObserver === 'undefined') {
      return;
    }
    STATE.observer = new MutationObserver(function(mutations) {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && (mutation.addedNodes.length || mutation.removedNodes.length)) {
          bindDom();
          break;
        }
      }
    });
    STATE.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function observeLanguageChanges() {
    if (STATE.langObserver || typeof MutationObserver === 'undefined' || !document.documentElement) {
      return;
    }
    STATE.langObserver = new MutationObserver(function(mutations) {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'lang') {
          syncVerifyDetectedMessageByLang();
          break;
        }
      }
    });
    STATE.langObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang']
    });
  }

  function init() {
    migrateLegacyIfNeeded();
    bindDom();
    observeDomChanges();
    observeLanguageChanges();
    // 初次加载时再同步一次，避免语言切换与 DOM 绑定时序导致提示语言不一致。
    setTimeout(syncVerifyDetectedMessageByLang, 120);
  }

  window.FretLabPayment = {
    init: init,
    createPayment: startPayment,
    verifyAccessCode: verifyAccessCode,
    showOrderLookupDialog: showOrderLookupDialog,
    showRefundDialog: showRefundDialog,
    hasAccess: hasAccess,
    getStoredAccess: getStoredAccess,
    config: CONFIG
  };

  document.addEventListener('DOMContentLoaded', function() {
    init();
    // React 页面可能稍后渲染，再做一次兜底绑定
    setTimeout(bindDom, 600);
    setTimeout(bindDom, 1600);
  });
})();
