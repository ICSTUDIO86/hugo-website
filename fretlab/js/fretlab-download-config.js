(function() {
  'use strict';

  const STORAGE_BASE = 'https://636c-cloud1-4g1r5ho01a0cfd85-1377702774.tcb.qcloud.la/downloads/tools/fretlab';
  const API_BASE = 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com';

  const existing = window.FRETLAB_PAYMENT_CONFIG || {};
  window.FRETLAB_PAYMENT_CONFIG = {
    ...existing,
    mockPaymentSuccess: false,
    downloads: {
      ...(existing.downloads || {}),
      windows_x64: `${STORAGE_BASE}/FretLab-1.0.7-win-x64-setup.exe`,
      mac_arm64: `${STORAGE_BASE}/FretLab-1.0.7-mac-arm64.dmg`,
      mac_x64: `${STORAGE_BASE}/FretLab-1.0.7-mac-x64.dmg`,
      linux_amd64: `${STORAGE_BASE}/FretLab-1.0.7-linux-amd64.deb`
    },
    downloadSizes: {
      ...(existing.downloadSizes || {}),
      windows_x64: '',
      mac_arm64: '',
      mac_x64: '',
      linux_amd64: ''
    },
    api: {
      ...(existing.api || {}),
      createPayment: `${API_BASE}/createFretlabPayment`,
      checkOrder: `${API_BASE}/checkFretlabOrder`,
      verifyCode: `${API_BASE}/verifyFretlabAccessCode`,
      lookupOrder: `${API_BASE}/findFretlabAccessCodeByOrderNo`,
      refundByAccessCode: `${API_BASE}/refundFretlabByAccessCode`,
      orderDetails: `${API_BASE}/getFretlabOrderDetails`
    }
  };
})();
