/**
 * Single Product Config
 * Central config for single-product purchase & downloads
 */

(function() {
  'use strict';

  const STORAGE_BASE = 'https://636c-cloud1-4g1r5ho01a0cfd85-1377702774.tcb.qcloud.la/downloads/tools';

  window.IC_SINGLE_PRODUCT_CONFIG = {
    api: {
      createPayment: 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/createSinglePayment',
      checkOrder: 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/checkSingleOrder',
      verifyCode: 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/verifySingleAccessCode'
    },
    tools: {
      melody: {
        id: 'melody',
        name: 'Cognote 旋律生成器',
        startUrl: '/tools/melody-generator.html',
        downloads: {
          mac_arm64: `${STORAGE_BASE}/melody/Cognote-melody-mac-arm64.dmg`,
          mac_x64: `${STORAGE_BASE}/melody/Cognote-melody-mac-x64.dmg`,
          windows_x64: `${STORAGE_BASE}/melody/Cognote-melody-win-x64-setup.exe`,
          linux_amd64: `${STORAGE_BASE}/melody/Cognote-melody-linux-amd64.deb`
        }
      },
      jianpu: {
        id: 'jianpu',
        name: 'Cognote 简谱生成器',
        startUrl: '/tools/jianpu-generator.html',
        downloads: {
          mac_arm64: `${STORAGE_BASE}/jianpu/Cognote-jianpu-mac-arm64.dmg`,
          mac_x64: `${STORAGE_BASE}/jianpu/Cognote-jianpu-mac-x64.dmg`,
          windows_x64: `${STORAGE_BASE}/jianpu/Cognote-jianpu-win-x64-setup.exe`,
          linux_amd64: `${STORAGE_BASE}/jianpu/Cognote-jianpu-linux-amd64.deb`
        }
      },
      rhythm: {
        id: 'rhythm',
        name: 'Cognote 节奏生成器',
        startUrl: '/tools/rhythm.html',
        downloads: {
          mac_arm64: `${STORAGE_BASE}/rhythm/Cognote-rhythm-mac-arm64.dmg`,
          mac_x64: `${STORAGE_BASE}/rhythm/Cognote-rhythm-mac-x64.dmg`,
          windows_x64: `${STORAGE_BASE}/rhythm/Cognote-rhythm-win-x64-setup.exe`,
          linux_amd64: `${STORAGE_BASE}/rhythm/Cognote-rhythm-linux-amd64.deb`
        }
      },
      chord: {
        id: 'chord',
        name: 'Cognote 和弦生成器',
        startUrl: '/tools/chord-generator.html',
        downloads: {
          mac_arm64: `${STORAGE_BASE}/chord/Cognote-chord-mac-arm64.dmg`,
          mac_x64: `${STORAGE_BASE}/chord/Cognote-chord-mac-x64.dmg`,
          windows_x64: `${STORAGE_BASE}/chord/Cognote-chord-win-x64-setup.exe`,
          linux_amd64: `${STORAGE_BASE}/chord/Cognote-chord-linux-amd64.deb`
        }
      },
      interval: {
        id: 'interval',
        name: 'Cognote 音程生成器',
        startUrl: '/tools/interval-generator.html',
        downloads: {
          mac_arm64: `${STORAGE_BASE}/interval/Cognote-interval-mac-arm64.dmg`,
          mac_x64: `${STORAGE_BASE}/interval/Cognote-interval-mac-x64.dmg`,
          windows_x64: `${STORAGE_BASE}/interval/Cognote-interval-win-x64-setup.exe`,
          linux_amd64: `${STORAGE_BASE}/interval/Cognote-interval-linux-amd64.deb`
        }
      }
    }
  };
})();
