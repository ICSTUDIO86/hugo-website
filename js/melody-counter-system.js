/**
 * IC 视奏工具 - 20条旋律严格计数系统
 * 基于服务端验证，刷新无法绕过
 * 每台设备限制生成20条旋律
 */

class MelodyCounterSystem {
  constructor() {
    this.apiEndpoint = 'https://cloud1-4g1r5ho01a0cfd85.service.tcloudbase.com/trialCounter';
    this.isGenerating = false; // 防止重复点击
    this.currentStatus = null;
    this.originalGenerateMelody = null;
    this.initialized = false; // 标记是否已初始化
    this.cachedFingerprint = null; // 缓存设备指纹以提升性能
  }

  // 生成设备指纹（与服务端保持一致）
  generateDeviceFingerprint() {
    // 重新启用缓存提升性能
    if (this.cachedFingerprint) {
      console.log('⚡ 使用缓存的设备指纹');
      return this.cachedFingerprint;
    }

    console.log('🔍 首次生成设备指纹...');
    const fp = [];

    try {
      // 基础浏览器信息
      const userAgent = navigator.userAgent || 'unknown';
      const language = navigator.language || 'unknown';
      const languages = (navigator.languages || []).join(',') || 'unknown';
      const platform = navigator.platform || 'unknown';
      const cookieEnabled = navigator.cookieEnabled;

      fp.push(userAgent);
      fp.push(language);
      fp.push(languages);
      fp.push(platform);
      fp.push(cookieEnabled);

      console.log('  - userAgent 长度:', userAgent.length);
      console.log('  - language:', language);
      console.log('  - platform:', platform);
      console.log('  - cookieEnabled:', cookieEnabled);

      // 屏幕信息
      const screenInfo = `${screen.width}x${screen.height}`;
      const colorDepth = screen.colorDepth || 'unknown';
      const pixelDepth = screen.pixelDepth || 'unknown';
      const devicePixelRatio = window.devicePixelRatio || 'unknown';

      fp.push(screenInfo);
      fp.push(colorDepth);
      fp.push(pixelDepth);
      fp.push(devicePixelRatio);

      console.log('  - 屏幕信息:', screenInfo);
      console.log('  - 颜色深度:', colorDepth);
      console.log('  - 设备像素比:', devicePixelRatio);

      // 时区信息
      let timeZone = 'unknown';
      try {
        timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
      } catch (e) {
        console.warn('  - 时区获取失败:', e.message);
        timeZone = 'unknown';
      }
      const timezoneOffset = new Date().getTimezoneOffset();

      fp.push(timeZone);
      fp.push(timezoneOffset);

      console.log('  - 时区:', timeZone);
      console.log('  - 时区偏移:', timezoneOffset);

      // 硬件信息
      const hardwareConcurrency = navigator.hardwareConcurrency || 'unknown';
      const maxTouchPoints = navigator.maxTouchPoints || 0;
      const deviceMemory = navigator.deviceMemory || 'unknown';

      fp.push(hardwareConcurrency);
      fp.push(maxTouchPoints);
      fp.push(deviceMemory);

      console.log('  - CPU核心数:', hardwareConcurrency);
      console.log('  - 最大触点数:', maxTouchPoints);
      console.log('  - 设备内存:', deviceMemory);

      // 增强指纹（包含无痕浏览检测）
      const enhancedFingerprint = this.getQuickFingerprint();
      fp.push(enhancedFingerprint);
      console.log('  - 增强指纹:', enhancedFingerprint.substring(0, 50) + '...');

      // 添加Canvas指纹增强唯一性（针对无痕模式）
      const canvasFingerprint = this.getCanvasFingerprint();
      fp.push(canvasFingerprint);
      console.log('  - Canvas指纹:', canvasFingerprint.substring(0, 20) + '...');

      const result = fp.join('|');
      console.log('✅ 设备指纹生成完成');
      console.log('  - 总长度:', result.length);
      console.log('  - 组件数量:', fp.length);
      console.log('  - 前100字符:', result.substring(0, 100) + '...');

      // 验证指纹不为空
      if (!result || result.length < 10) {
        throw new Error('生成的指纹过短');
      }

      // 缓存指纹以提升后续请求性能
      this.cachedFingerprint = result;
      return result;
    } catch (error) {
      console.error('❌ 设备指纹生成失败:', error);
      // 返回基础指纹作为备用（移除随机部分以确保一致性）
      const fallbackFingerprint = `${navigator.userAgent || 'unknown'}|${navigator.platform || 'unknown'}|${screen.width}x${screen.height}`;
      console.log('🔄 使用备用指纹长度:', fallbackFingerprint.length);

      // 缓存备用指纹
      this.cachedFingerprint = fallbackFingerprint;
      return fallbackFingerprint;
    }
  }

  // 超强设备指纹（防清理数据绕过）
  getQuickFingerprint() {
    try {
      const parts = [];

      // 1. 完整UserAgent（最重要的标识）
      parts.push(navigator.userAgent || 'unknown');

      // 2. 硬件特征（清理数据后不变）
      parts.push(screen.width.toString());
      parts.push(screen.height.toString());
      parts.push(screen.colorDepth.toString());
      parts.push(window.devicePixelRatio.toString());
      parts.push(navigator.hardwareConcurrency || '0');
      parts.push(navigator.maxTouchPoints || '0');
      parts.push(navigator.platform || 'unknown');

      // 3. 系统级特征（清理数据后不变）
      parts.push(new Date().getTimezoneOffset().toString());
      parts.push(navigator.language || 'unknown');
      parts.push((navigator.languages || []).join(','));

      // 4. 浏览器安装特征
      try {
        const plugins = Array.from(navigator.plugins || []).map(p => p.name).sort();
        if (plugins.length > 0) {
          parts.push('PLUGINS:' + plugins.slice(0, 5).join(','));
        }
      } catch (e) {
        parts.push('no-plugins');
      }

      // 5. WebGL渲染器信息（硬件绑定）
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            if (renderer) {
              parts.push('GPU:' + renderer.substring(0, 50));
            }
          }
        }
      } catch (e) {
        parts.push('no-webgl');
      }

      // 6. Canvas指纹（唯一标识）
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device Binding Test', 2, 2);
        const canvasData = canvas.toDataURL();
        parts.push('CANVAS:' + canvasData.slice(-20));
      } catch (e) {
        parts.push('no-canvas');
      }

      // 7. 无痕模式检测
      parts.push('PRIVATE:' + this.detectPrivateBrowsing().toString());

      // 8. 网络信息
      if (navigator.connection) {
        parts.push('NET:' + (navigator.connection.effectiveType || 'unknown'));
      }

      // 9. 内存信息
      if (navigator.deviceMemory) {
        parts.push('MEM:' + navigator.deviceMemory);
      }

      return parts.join('|');
    } catch (e) {
      return 'super-fingerprint-error:' + e.message;
    }
  }

  // 检测无痕浏览模式
  detectPrivateBrowsing() {
    try {
      // 检测多种无痕模式特征
      const features = [];

      // localStorage在某些无痕模式下可能受限
      try {
        const testKey = '_test_private_browsing_' + Date.now();
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
        features.push('local-storage-ok');
      } catch (e) {
        features.push('local-storage-restricted');
      }

      // sessionStorage检测
      try {
        const testKey = '_test_session_' + Date.now();
        sessionStorage.setItem(testKey, '1');
        sessionStorage.removeItem(testKey);
        features.push('session-storage-ok');
      } catch (e) {
        features.push('session-storage-restricted');
      }

      // IndexedDB在无痕模式下可能不可用
      features.push(window.indexedDB ? 'indexeddb-ok' : 'no-indexeddb');

      // 检查是否为无痕模式的其他特征
      if (navigator.webdriver) features.push('webdriver');
      if (window.outerHeight === 0) features.push('headless');

      return features.join('-');
    } catch (e) {
      return 'detection-error';
    }
  }

  // 简化Canvas指纹（性能优化）
  getSimpleCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // 简单绘制，避免复杂操作
      ctx.fillStyle = '#f60';
      ctx.fillRect(0, 0, 50, 20);

      return canvas.toDataURL().slice(-30);
    } catch (e) {
      return 'canvas_error';
    }
  }

  // 简化WebGL信息（性能优化）
  getSimpleWebGLInfo() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

      if (!gl) return 'no_webgl';

      // 获取基本WebGL信息，避免昂贵的扩展查询
      const version = gl.getParameter(gl.VERSION) || 'unknown';
      const vendor = gl.getParameter(gl.VENDOR) || 'unknown';

      return `${vendor}_${version}`.substring(0, 50);
    } catch (e) {
      return 'webgl_error';
    }
  }

  // 原始Canvas指纹（保留备用）
  getCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('IC Studio Melody Counter', 2, 15);

      return canvas.toDataURL().slice(-50);
    } catch (e) {
      return 'canvas_error';
    }
  }

  // 原始WebGL指纹（保留备用）
  getWebGLFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

      if (!gl) return 'no_webgl';

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        return `${vendor}_${renderer}`;
      }

      return gl.getParameter(gl.VERSION);
    } catch (e) {
      return 'webgl_error';
    }
  }

  // 美观的自定义弹窗
  showCustomAlert(title, message, buttonText = '了解', buttonAction = null) {
    // 移除已存在的弹窗
    const existingModal = document.getElementById('ic-custom-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // 创建弹窗HTML
    const modalHTML = `
      <div id="ic-custom-modal" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      ">
        <div style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 20px;
          padding: 0;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          animation: modalSlideIn 0.3s ease-out;
          position: relative;
          overflow: hidden;
        ">
          <style>
            @keyframes modalSlideIn {
              from { transform: scale(0.8) translateY(-50px); opacity: 0; }
              to { transform: scale(1) translateY(0); opacity: 1; }
            }
          </style>

          <!-- 顶部装饰 -->
          <div style="
            background: rgba(255, 255, 255, 0.15);
            height: 4px;
            margin-bottom: 30px;
          "></div>

          <!-- 内容区域 -->
          <div style="padding: 30px;">
            <!-- 图标 -->
            <div style="
              text-align: center;
              margin-bottom: 20px;
            ">
              <div style="
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                width: 80px;
                height: 80px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto;
                border: 3px solid rgba(255, 255, 255, 0.3);
              ">
                <span style="font-size: 40px;">🎵</span>
              </div>
            </div>

            <!-- 标题 -->
            <h3 style="
              color: white;
              text-align: center;
              margin: 0 0 15px 0;
              font-size: 22px;
              font-weight: 600;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            ">${title}</h3>

            <!-- 消息 -->
            <p style="
              color: rgba(255, 255, 255, 0.9);
              text-align: center;
              margin: 0 0 30px 0;
              font-size: 16px;
              line-height: 1.5;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            ">${message}</p>

            <!-- 按钮 -->
            <div style="text-align: center;">
              <button id="ic-modal-btn" style="
                background: rgba(255, 255, 255, 0.2);
                border: 2px solid rgba(255, 255, 255, 0.4);
                color: white;
                padding: 12px 30px;
                border-radius: 30px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                min-width: 120px;
              " onmouseover="
                this.style.background='rgba(255, 255, 255, 0.3)';
                this.style.transform='translateY(-2px)';
                this.style.boxShadow='0 8px 20px rgba(0, 0, 0, 0.2)';
              " onmouseout="
                this.style.background='rgba(255, 255, 255, 0.2)';
                this.style.transform='translateY(0)';
                this.style.boxShadow='none';
              ">${buttonText}</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // 添加到页面
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // 绑定事件
    const modal = document.getElementById('ic-custom-modal');
    const button = document.getElementById('ic-modal-btn');

    const closeModal = () => {
      if (modal) {
        modal.style.animation = 'modalSlideOut 0.2s ease-in';
        setTimeout(() => modal.remove(), 200);
      }
    };

    // 点击按钮
    button.onclick = () => {
      if (buttonAction && typeof buttonAction === 'function') {
        buttonAction();
      }
      closeModal();
    };

    // 点击背景关闭
    modal.onclick = (e) => {
      if (e.target === modal) {
        closeModal();
      }
    };

    // ESC键关闭
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);

    // 添加退出动画样式
    const style = document.createElement('style');
    style.textContent = `
      @keyframes modalSlideOut {
        from { transform: scale(1) translateY(0); opacity: 1; }
        to { transform: scale(0.8) translateY(-30px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // 检测是否为无痕浏览模式（全浏览器支持）
  isLikelyPrivateBrowsing() {
    try {
      const indicators = [];

      // 识别浏览器类型
      const userAgent = navigator.userAgent;
      const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent);
      const isFirefox = /Firefox/.test(userAgent);
      const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
      const isEdge = /Edge/.test(userAgent) || /Edg\//.test(userAgent);

      console.log('🌐 浏览器检测:', { isChrome, isFirefox, isSafari, isEdge });

      // 1. 通用存储检测
      try {
        const testKey = '_incognito_test_' + Date.now();
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
      } catch (e) {
        indicators.push('localStorage-blocked');
      }

      try {
        const testKey = '_session_test_' + Date.now();
        sessionStorage.setItem(testKey, '1');
        sessionStorage.removeItem(testKey);
      } catch (e) {
        indicators.push('sessionStorage-blocked');
      }

      // 2. IndexedDB检测（Firefox Private模式通常禁用）
      if (!window.indexedDB) {
        indicators.push('no-indexedDB');
      } else {
        // 深度测试IndexedDB功能
        try {
          const request = indexedDB.open('_incognito_test_db', 1);
          request.onerror = () => indicators.push('indexedDB-blocked');
        } catch (e) {
          indicators.push('indexedDB-error');
        }
      }

      // 3. 历史记录检测（通用指标）
      if (history.length <= 1) {
        indicators.push('short-history');
      }

      // 4. Chrome特定检测
      if (isChrome) {
        // Chrome无痕模式特征
        if (!window.webkitRequestFileSystem) {
          indicators.push('chrome-no-filesystem');
        }

        // 检查Chrome的webkitTemporaryStorage
        if (navigator.webkitTemporaryStorage) {
          navigator.webkitTemporaryStorage.queryUsageAndQuota(
            (usage, quota) => {
              if (quota < 120000000) { // 小于120MB通常是无痕模式
                indicators.push('chrome-limited-quota');
              }
            }
          );
        }
      }

      // 5. Firefox特定检测
      if (isFirefox) {
        // Firefox Private模式特征
        if (!window.indexedDB) {
          indicators.push('firefox-no-indexedDB');
        }

        // 检查Mozilla特定API
        if (typeof InstallTrigger === 'undefined') {
          indicators.push('firefox-no-installtrigger');
        }
      }

      // 6. Safari特定检测
      if (isSafari) {
        // Safari无痕模式特征
        try {
          const testData = 'x'.repeat(1024 * 50); // 50KB
          const testKey = '_safari_quota_' + Date.now();
          localStorage.setItem(testKey, testData);
          localStorage.removeItem(testKey);
        } catch (e) {
          indicators.push('safari-quota-limited');
        }

        if (!window.webkitRequestFileSystem) {
          indicators.push('safari-no-filesystem');
        }

        if (typeof window.openDatabase !== 'function') {
          indicators.push('safari-no-websql');
        }
      }

      // 7. Edge特定检测
      if (isEdge) {
        // Edge InPrivate模式特征
        if (!window.webkitRequestFileSystem) {
          indicators.push('edge-no-filesystem');
        }
      }

      // 8. 通用API检测
      // WebRTC检测
      if (!window.RTCPeerConnection && !window.webkitRTCPeerConnection && !window.mozRTCPeerConnection) {
        indicators.push('no-webrtc');
      }

      // 通知权限检测
      if (Notification && Notification.permission === 'denied') {
        indicators.push('notifications-denied');
      }

      // Service Worker检测
      if (!navigator.serviceWorker) {
        indicators.push('no-serviceworker');
      }

      // 9. 窗口特征检测
      if (!window.name || window.name === '') {
        indicators.push('empty-window-name');
      }

      // 检查是否是全新窗口（无痕模式常见特征）
      if (window.performance && window.performance.navigation) {
        if (window.performance.navigation.type === 0 && history.length === 1) {
          indicators.push('fresh-window');
        }
      }

      // 10. 决策逻辑 - 采用较低阈值确保捕获所有无痕模式
      const threshold = 1; // 任何一个指标都触发无痕模式检测
      const isPrivate = indicators.length >= threshold;

      console.log('🕵️ 全浏览器无痕检测:', {
        browser: { isChrome, isFirefox, isSafari, isEdge },
        indicators: indicators,
        indicatorCount: indicators.length,
        threshold: threshold,
        isPrivateBrowsing: isPrivate
      });

      return isPrivate;
    } catch (error) {
      console.error('❌ 无痕浏览检测失败:', error);
      // 检测失败时，为了安全起见，假设是无痕模式
      return true;
    }
  }

  // 获取和管理无痕浏览使用次数
  getPrivateBrowsingUsage() {
    try {
      // 尝试使用sessionStorage记录无痕模式使用
      const key = 'private_melody_count';
      let count = parseInt(sessionStorage.getItem(key) || '0');
      return count;
    } catch (e) {
      // 如果sessionStorage不可用，使用内存计数（页面刷新会重置）
      if (!window._privateCount) window._privateCount = 0;
      return window._privateCount;
    }
  }

  // 增加无痕浏览使用次数
  incrementPrivateBrowsingUsage() {
    try {
      const key = 'private_melody_count';
      let count = parseInt(sessionStorage.getItem(key) || '0') + 1;
      sessionStorage.setItem(key, count.toString());
      return count;
    } catch (e) {
      // 回退到内存计数
      if (!window._privateCount) window._privateCount = 0;
      window._privateCount++;
      return window._privateCount;
    }
  }

  // 检查是否有访问码
  getAccessCode() {
    // 检查各种可能存储访问码的地方
    const possibleCodes = [
      localStorage.getItem('ic-sight-reading-license'),
      localStorage.getItem('ic-premium-access')
    ];

    for (const codeData of possibleCodes) {
      if (!codeData) continue;

      try {
        // 尝试解析JSON格式
        const parsed = JSON.parse(codeData);
        if (parsed.code && parsed.code.length >= 10) {
          return parsed.code;
        }
      } catch {
        // 如果不是JSON，直接使用
        if (codeData && codeData.length >= 10) {
          return codeData;
        }
      }
    }

    return null;
  }

  // 检查是否为本地开发环境
  isLocalDevelopment() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const fullURL = window.location.href;

    // 详细的调试信息
    console.log('🔍 Hostname检测调试信息:');
    console.log('  - hostname:', hostname);
    console.log('  - protocol:', protocol);
    console.log('  - fullURL:', fullURL);

    // 严格限制本地模式，只在真正的开发环境下启用
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isPrivateIP = hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.');

    // 生产环境域名检测 - 包括所有可能的部署域名
    const isProduction =
      hostname.includes('icstudio.club') ||  // 主域名
      hostname.includes('icstudio86.github.io') ||  // GitHub Pages
      hostname.includes('github.io') ||  // 任何GitHub Pages
      hostname.includes('.com') ||  // 任何.com域名
      hostname.includes('.net') ||  // 任何.net域名
      hostname.includes('.org') ||  // 任何.org域名
      hostname.includes('.cn') ||   // 任何.cn域名
      hostname.includes('.app') ||  // 任何.app域名
      hostname.includes('.dev') ||  // 任何.dev域名
      hostname.includes('.io');     // 任何.io域名

    // file://协议检测（本地文件）
    const isFileProtocol = protocol === 'file:';

    console.log('  - isLocalhost:', isLocalhost);
    console.log('  - isPrivateIP:', isPrivateIP);
    console.log('  - isProduction:', isProduction);
    console.log('  - isFileProtocol:', isFileProtocol);

    // 如果是生产环境，强制使用服务端模式
    if (isProduction) {
      console.log('🌐 检测到生产环境，强制使用服务端模式');
      return false;
    }

    // 只有在localhost、私有IP或file协议下才使用本地模式
    const useLocalMode = isLocalhost || isPrivateIP || isFileProtocol;

    if (useLocalMode) {
      console.log(`🏠 使用本地模式 - 原因: ${isLocalhost ? 'localhost' : isPrivateIP ? 'private IP' : 'file protocol'}`);
    } else {
      console.log(`🌐 使用服务端模式 - hostname: ${hostname}`);
    }

    return useLocalMode;
  }

  // 本地开发模式的模拟数据
  getLocalMockData(action) {
    const localUsage = parseInt(localStorage.getItem('local-melody-count') || '0');

    if (action === 'increment') {
      const newCount = localUsage + 1;
      localStorage.setItem('local-melody-count', newCount.toString());
      console.log(`🏠 本地模式: 增加计数到 ${newCount}`);

      return {
        success: true,
        allowed: newCount <= 20,
        expired: newCount > 20,
        used: newCount,
        total: 20,
        remaining: Math.max(0, 20 - newCount),
        message: newCount > 20 ? '本地试用次数已用完' : `本地剩余 ${Math.max(0, 20 - newCount)} 条旋律`,
        isLocalMode: true
      };
    }

    return {
      success: true,
      allowed: localUsage < 20,
      expired: localUsage >= 20,
      used: localUsage,
      total: 20,
      remaining: Math.max(0, 20 - localUsage),
      message: localUsage >= 20 ? '本地试用次数已用完' : `本地剩余 ${Math.max(0, 20 - localUsage)} 条旋律`,
      isLocalMode: true
    };
  }

  // 向服务端请求验证和计数
  // 检查用户是否有有效的访问码（优先级最高）
  hasValidLocalAccessCode() {
    try {
      const accessData = localStorage.getItem('ic-premium-access');
      if (!accessData) return false;

      const data = JSON.parse(accessData);
      if (data && data.code && data.code.length >= 10) {
        console.log('✅ 检测到本地有效访问码，完整版用户');
        return true;
      }
    } catch (error) {
      console.error('检查本地访问码失败:', error);
    }
    return false;
  }

  async requestMelodyGeneration(action = 'check') {
    // 🔥 优先检查：如果用户有有效访问码，直接返回无限制状态
    if (this.hasValidLocalAccessCode()) {
      console.log('🎫 完整版用户，跳过所有限制和服务器验证');
      const fullAccessResult = {
        success: true,
        allowed: true,
        hasFullAccess: true,
        expired: false,
        used: 0,
        total: Infinity,
        remaining: Infinity,
        message: '',
        isFirstTime: false
      };

      // 更新本地状态缓存
      this.currentStatus = fullAccessResult;

      // 隐藏所有试用相关UI
      this.hideAllTrialUI();

      return fullAccessResult;
    }

    // 本地开发模式
    if (this.isLocalDevelopment()) {
      console.log(`🏠 本地开发模式: [${action}]`);
      return this.getLocalMockData(action);
    }

    try {
      const deviceFingerprint = this.generateDeviceFingerprint();
      const accessCode = this.getAccessCode();

      // 详细调试信息
      console.log(`🎵 [${action}] 向服务端请求...`);
      console.log('🔍 请求参数调试:');
      console.log('  - action:', action);
      console.log('  - deviceFingerprint长度:', deviceFingerprint ? deviceFingerprint.length : 'null');
      console.log('  - deviceFingerprint前50字符:', deviceFingerprint ? deviceFingerprint.substring(0, 50) + '...' : 'null');
      console.log('  - userAgent存在:', !!navigator.userAgent);
      console.log('  - userAgent长度:', navigator.userAgent ? navigator.userAgent.length : 'null');
      console.log('  - accessCode:', accessCode ? '存在' : '无');

      // 验证必要参数
      if (!deviceFingerprint) {
        console.error('❌ deviceFingerprint 为空');
        throw new Error('设备指纹生成失败');
      }

      if (!navigator.userAgent) {
        console.error('❌ userAgent 为空');
        throw new Error('用户代理信息缺失');
      }

      const requestBody = {
        action: action,
        deviceFingerprint: deviceFingerprint,
        userAgent: navigator.userAgent,
        accessCode: accessCode // 如果有访问码，会跳过限制
      };

      console.log('📤 发送请求体:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const responseText = await response.text();
      let result;

      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        // 如果响应不是JSON，可能是CloudBase包装的响应
        console.log('🔄 尝试解析CloudBase响应格式...');
        if (responseText.includes('"body":')) {
          const cloudbaseResponse = JSON.parse(responseText);
          result = JSON.parse(cloudbaseResponse.body);
        } else {
          throw new Error('响应格式不正确');
        }
      }

      console.log(`📊 服务端响应:`, result);
      console.log(`📊 响应详细内容:`, JSON.stringify(result, null, 2));

      // 验证响应格式
      if (!result || typeof result !== 'object') {
        console.error('❌ 无效的服务端响应格式');
        throw new Error('服务端响应格式错误');
      }

      this.currentStatus = result;
      return result;

    } catch (error) {
      console.error('❌ 服务端请求失败:', error);

      // 服务端错误时，降级到本地计数
      console.log('🔄 降级到本地计数模式...');
      return this.getLocalMockData(action);
    }
  }

  // 显示计数状态
  showCounterStatus(status) {
    // 查找或创建状态显示区域
    let statusDiv = document.getElementById('melody-counter-status');
    if (!statusDiv) {
      // 在生成按钮附近创建状态显示
      const generateBtn = document.querySelector('button[onclick*="generateMelody"]');
      if (generateBtn && generateBtn.parentElement) {
        statusDiv = document.createElement('div');
        statusDiv.id = 'melody-counter-status';
        statusDiv.style.cssText = `
          margin: 15px 0;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          text-align: center;
          transition: all 0.3s ease;
        `;
        generateBtn.parentElement.insertBefore(statusDiv, generateBtn.nextSibling);
      }
    }

    if (!statusDiv) return;

    // 根据状态显示简洁的试用信息
    if (status.hasFullAccess) {
      statusDiv.style.display = 'none';
      // 隐藏所有试用相关的UI元素
      this.hideAllTrialUI();
    } else if (status.expired) {
      // 试用结束时显示提示
      statusDiv.style.background = '#ffebee';
      statusDiv.style.color = '#c62828';
      statusDiv.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px;">😔 试用次数已用完</div>
        <div style="font-size: 12px; margin-top: 8px;">请购买完整版继续使用</div>
      `;
    } else if (status.error) {
      // 错误状态
      statusDiv.style.background = '#fff3e0';
      statusDiv.style.color = '#e65100';
      statusDiv.innerHTML = `⚠️ ${status.error}`;
    } else {
      // 显示简洁的剩余次数信息（无"免费试用模式"等文字）
      const used = status.used || 0;
      const total = status.total || 20;
      const remaining = status.remaining || (total - used);

      statusDiv.style.background = '#f5f5f5';
      statusDiv.style.color = '#424242';
      statusDiv.innerHTML = `
        <div style="text-align: center; font-size: 14px;">
          剩余试用: <strong>${remaining}</strong> / ${total} 次
        </div>
      `;
    }
  }

  // 更新生成按钮状态
  updateGenerateButton(status) {
    const generateBtn = document.getElementById('generateBtn') ||
                       document.querySelector('button[onclick*="generateMelody"]') ||
                       document.querySelector('button.btn-primary');

    if (!generateBtn) return;

    if (status.expired && !status.hasFullAccess) {
      generateBtn.disabled = true;
      generateBtn.style.opacity = '0.5';
      generateBtn.style.cursor = 'not-allowed';
      generateBtn.textContent = '试用已结束';
    } else if (this.isGenerating) {
      generateBtn.disabled = true;
      generateBtn.textContent = '生成中...';
    } else {
      generateBtn.disabled = false;
      generateBtn.style.opacity = '1';
      generateBtn.style.cursor = 'pointer';
      generateBtn.textContent = '生成旋律';
    }
  }

  // 拦截并包装原始的generateMelody函数
  wrapGenerateMelodyFunction() {
    // 防止重复包装
    if (window.generateMelody && window.generateMelody._isWrapped) {
      console.log('⚠️ generateMelody已经被包装过了');
      return;
    }

    // 保存原始函数（确保不是undefined）
    if (!window.generateMelody) {
      console.error('❌ generateMelody函数还不存在，延迟包装...');
      // 延迟重试
      setTimeout(() => this.wrapGenerateMelodyFunction(), 500);
      return;
    }

    this.originalGenerateMelody = window.generateMelody;
    console.log('📌 保存原始generateMelody函数:', typeof this.originalGenerateMelody);

    // 创建新的包装函数 - 完全异步模式
    const self = this;
    window.generateMelody = function() {
      console.log('🎼 用户点击生成旋律按钮');

      // 🔥 优先检查：如果用户有有效访问码，直接允许生成，跳过所有限制
      if (self.hasValidLocalAccessCode()) {
        console.log('🎫 完整版用户检测，立即允许生成旋律');

        // 隐藏所有试用相关UI
        self.hideAllTrialUI();

        // 更新UI状态显示完整版权限
        self.showCounterStatus({
          hasFullAccess: true,
          allowed: true,
          message: ''
        });
        // 直接调用原始函数，无需任何验证
        return self.originalGenerateMelody.call(this);
      }

      // 检测无痕浏览并应用严格限制
      const isPrivateBrowsing = self.isLikelyPrivateBrowsing();
      if (isPrivateBrowsing) {
        console.log('🕵️ 检测到疑似无痕浏览模式');

        // 对无痕浏览应用更严格的限制
        const privateUsage = self.getPrivateBrowsingUsage();
        if (privateUsage >= 3) { // 无痕模式只允许3次试用
          console.log('🚫 无痕浏览试用次数已用完');
          self.showCounterStatus({
            success: true,
            allowed: false,
            expired: true,
            used: privateUsage,
            total: 3,
            remaining: 0,
            message: '无痕浏览模式限制3次试用',
            isPrivateMode: true
          });
          self.showPurchasePrompt();
          return;
        }
      }

      // 只有在明确知道已过期时才阻止（基于上次API结果）
      if (self.currentStatus && self.currentStatus.expired && !self.currentStatus.hasFullAccess) {
        console.log('🚫 已知状态：试用已过期');
        self.showPurchasePrompt();
        return;
      }

      // ⚡ 立即调用原始函数 - 零延迟响应
      console.log('⚡ 立即响应：调用原始generateMelody');
      let result;
      if (self.originalGenerateMelody) {
        try {
          // 立即同步调用，不使用await避免任何延迟
          result = self.originalGenerateMelody.apply(this, arguments);
        } catch (error) {
          console.error('❌ 同步调用失败，尝试异步:', error);
          // 如果同步失败，回退到异步
          result = Promise.resolve(self.originalGenerateMelody.apply(this, arguments));
        }
      }

      // 🔄 后台异步处理所有验证和计数（完全不阻塞）
      setTimeout(() => {
        self.handleBackgroundValidation(isPrivateBrowsing);
      }, 0);

      return result;
    };

    // 标记为已包装
    window.generateMelody._isWrapped = true;

    console.log('✅ 旋律计数系统已激活');
  }

  // 后台验证处理（完全异步，不阻塞用户体验）
  async handleBackgroundValidation(isPrivateBrowsing = false) {
    try {
      console.log('🔄 后台验证开始...', isPrivateBrowsing ? '[无痕模式]' : '[正常模式]');

      if (isPrivateBrowsing) {
        // 无痕浏览模式：本地计数
        const newCount = this.incrementPrivateBrowsingUsage();
        console.log('📊 无痕模式计数:', newCount);

        this.showCounterStatus({
          success: true,
          allowed: newCount <= 3,
          expired: newCount > 3,
          used: newCount,
          total: 3,
          remaining: Math.max(0, 3 - newCount),
          message: newCount > 3 ? '无痕浏览试用已用完' : `无痕模式剩余 ${Math.max(0, 3 - newCount)} 条旋律`,
          isPrivateMode: true
        });
      } else {
        // 正常模式：服务端验证
        const result = await this.requestMelodyGeneration('increment');
        console.log('📊 服务端计数完成:', {
          success: result.success,
          used: result.used,
          remaining: result.remaining
        });

        // 更新显示
        this.showCounterStatus(result);
        this.updateGenerateButton(result);

        // 处理限制提醒
        if (result.remaining === 0 && !result.hasFullAccess) {
          setTimeout(() => {
            this.showCustomAlert(
              '🎵 最后一条免费旋律',
              '这是您的最后一条免费旋律！\n\n如需继续使用更多功能，请考虑购买完整版。',
              '了解完整版',
              () => {
                // 跳转到视奏工具页面的付费区域
                window.location.href = '/sight-reading-tool/#-立即行动';
              }
            );
          }, 2000);
        } else if (result.remaining === 5 && !result.hasFullAccess) {
          console.log('⚠️ 仅剩5条免费旋律');
        }

        // 如果已达到限制，显示购买提示
        if (result.expired) {
          setTimeout(() => {
            this.showPurchasePrompt();
          }, 1000);
        }
      }

    } catch (error) {
      console.error('❌ 后台验证失败:', error);
      // 静默失败，不影响用户体验
      this.showCounterStatus({
        error: '计数验证失败，下次刷新时更新'
      });
    }
  }

  // 后台初始化（不阻塞用户体验）
  async backgroundInitialization() {
    try {
      console.log('🔄 后台初始化开始...');

      // 预加载设备指纹
      this.preloadDeviceFingerprint();

      // 检测无痕模式
      const isPrivateBrowsing = this.isLikelyPrivateBrowsing();
      console.log('🕵️ 初始化无痕模式检测:', isPrivateBrowsing);

      let status;
      if (isPrivateBrowsing) {
        // 无痕模式：使用本地计数
        const privateUsage = this.getPrivateBrowsingUsage();
        status = {
          success: true,
          allowed: privateUsage < 3,
          expired: privateUsage >= 3,
          used: privateUsage,
          total: 3,
          remaining: Math.max(0, 3 - privateUsage),
          message: privateUsage >= 3 ? '无痕浏览试用已用完' : `无痕模式剩余 ${Math.max(0, 3 - privateUsage)} 条旋律`,
          isPrivateMode: true
        };
      } else {
        // 正常模式：检查服务端状态
        status = await this.requestMelodyGeneration('check');
      }

      console.log('📊 后台状态检查完成:', {
        isPrivateMode: status.isPrivateMode,
        used: status.used,
        total: status.total,
        remaining: status.remaining,
        expired: status.expired
      });

      // 更新显示
      this.showCounterStatus(status);
      this.updateGenerateButton(status);

      // 如果已经过期，显示购买提示
      if (status.expired && !status.hasFullAccess) {
        this.showPurchasePrompt();
      }

      console.log('✅ 后台初始化完成');
    } catch (error) {
      console.error('❌ 后台初始化失败:', error);
      // 静默失败，显示默认状态
      this.showCounterStatus({
        error: '状态加载中...'
      });
    }
  }

  // 预加载设备指纹（后台生成以提升性能）
  async preloadDeviceFingerprint() {
    console.log('⚡ 预加载设备指纹中...');
    try {
      // 如果还没有缓存，立即生成
      if (!this.cachedFingerprint) {
        this.generateDeviceFingerprint();
        console.log('✅ 设备指纹预加载完成');
      } else {
        console.log('✅ 设备指纹已存在缓存');
      }
    } catch (error) {
      console.warn('⚠️ 设备指纹预加载失败:', error);
    }
  }

  // 显示购买提示
  showPurchasePrompt() {
    // 查找支付区域
    const paymentSection = document.getElementById('zpay-container');
    if (paymentSection) {
      paymentSection.style.display = 'block';
      // 平滑滚动到支付区域
      setTimeout(() => {
        paymentSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }

    // 查找访问码输入区域
    const accessCodeContainer = document.getElementById('access-code-container');
    if (accessCodeContainer) {
      accessCodeContainer.style.display = 'block';
    }
  }

  // 隐藏所有试用相关的UI元素
  hideAllTrialUI() {
    try {
      console.log('🔒 隐藏试用相关UI元素（完整版用户）');

      // 隐藏试用限制相关的元素
      const selectors = [
        '.trial-warning',
        '.trial-expired',
        '.trial-limit',
        '.trial-message',
        '.trial-status',
        '[class*="trial"]',
        '[id*="trial"]',
        'button[onclick*="upgrade"]',
        'button[onclick*="purchase"]',
        '.purchase-prompt',
        '.upgrade-prompt'
      ];

      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          element.style.display = 'none';
        });
      });

      // 特别处理可能的试用结束按钮
      const buttons = document.querySelectorAll('button');
      buttons.forEach(button => {
        const text = button.textContent || button.innerText;
        if (text.includes('试用已结束') || text.includes('试用结束') || text.includes('升级') || text.includes('购买')) {
          button.style.display = 'none';
        }
      });

      // 隐藏包含试用限制信息的文本元素
      const textElements = document.querySelectorAll('div, span, p');
      textElements.forEach(element => {
        const text = element.textContent || element.innerText;
        if (text.includes('试用次数已用完') ||
            text.includes('请购买完整版') ||
            text.includes('试用已结束') ||
            text.includes('条旋律')) {
          element.style.display = 'none';
        }
      });

      console.log('✅ 试用相关UI已隐藏');
    } catch (error) {
      console.error('❌ 隐藏试用UI失败:', error);
    }
  }

  // 检查并激活完整版功能
  checkAutoActivation() {
    try {
      // 检查是否有有效的本地访问码
      if (this.hasValidLocalAccessCode()) {
        console.log('🎯 检测到有效访问码，但不执行自动激活');
        // 不执行任何自动激活，让用户保持在当前页面
      } else {
        console.log('🔍 未检测到本地访问码，保持当前状态');
      }
    } catch (error) {
      console.error('❌ 自动激活检查失败:', error);
    }
  }


  // 验证访问码并激活完整版
  async verifyAndActivate() {
    try {
      const accessData = localStorage.getItem('ic-premium-access');
      if (!accessData) return;

      const data = JSON.parse(accessData);
      const accessCode = data.code;

      console.log('🔐 验证访问码有效性...');

      // 向服务器验证访问码是否仍然有效
      const response = await fetch('https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/trialCounter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check',
          accessCode: accessCode,
          deviceFingerprint: 'activation-check',
          userAgent: navigator.userAgent
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.hasFullAccess) {
          console.log('✅ 访问码验证通过，激活完整版功能');

          // 直接刷新页面激活完整版功能
          window.location.reload();
        } else {
          console.log('⚠️ 访问码已失效，清除本地存储');
          localStorage.removeItem('ic-premium-access');
        }
      } else {
        console.log('⚠️ 验证服务不可用，保持当前状态');
      }
    } catch (error) {
      console.error('❌ 访问码验证失败:', error);
    }
  }

  // 刷新状态方法，用于访问码验证成功后更新UI
  async refreshStatus() {
    console.log('🔄 刷新计数器状态...');

    // 重新检查状态
    const newStatus = await this.requestMelodyGeneration('check');

    // 更新UI
    this.showCounterStatus(newStatus);
    this.updateGenerateButton(newStatus);

    console.log('✅ 计数器状态已刷新:', newStatus);
  }

  // 初始化系统
  async init() {
    // 防止重复初始化
    if (this.initialized) {
      console.log('⚠️ 计数系统已经初始化过了');
      return true;
    }

    console.log('🚀 初始化20条旋律计数系统...');

    try {
      // 🔄 跳过自动激活检查，保持当前状态
      console.log('🔍 跳过自动激活检查');

      // 立即包装生成函数，确保用户可以立即使用
      this.wrapGenerateMelodyFunction();

      // 所有状态检查都在后台进行，不阻塞初始化
      setTimeout(() => {
        this.backgroundInitialization();
      }, 0);

      this.initialized = true; // 标记已初始化
      console.log('✅ 计数系统立即初始化完成');
      return true;

    } catch (error) {
      console.error('❌ 初始化失败:', error);
      return false;
    }
  }
}

// 全局实例
window.melodyCounterSystem = new MelodyCounterSystem();

// 立即初始化，不等待DOMContentLoaded
(function() {
  console.log('🎵 旋律计数系统脚本已加载');

  // 等待页面加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSystem);
  } else {
    // DOM已经加载完成
    initSystem();
  }

  function initSystem() {
    // 等待generateMelody函数就绪的辅助函数
    function waitForGenerateMelody(maxWait = 10000) {
      const startTime = Date.now();

      function check() {
        console.log('🔍 检查generateMelody状态:', typeof window.generateMelody);

        if (typeof window.generateMelody === 'function') {
          console.log('✅ generateMelody已就绪，启动计数系统');

          // 检查页面是否为视奏工具页面
          if (window.location.pathname.includes('sight-reading') ||
              document.querySelector('.sight-reading-tool') ||
              window.location.pathname.includes('tools')) {
            console.log('🎵 启动旋律计数系统...');
            window.melodyCounterSystem.init();
          } else {
            console.log('⏭️ 非视奏工具页面，跳过计数系统');
          }
          return;
        }

        // 检查超时
        if (Date.now() - startTime > maxWait) {
          console.error('❌ 等待generateMelody超时');
          return;
        }

        // 继续等待
        setTimeout(check, 500);
      }

      // 初始延迟1秒，让页面有时间加载
      setTimeout(check, 1000);
    }

    console.log('🎵 检查页面路径和元素...');
    console.log('  - 当前路径:', window.location.pathname);
    console.log('  - sight-reading-tool元素:', !!document.querySelector('.sight-reading-tool'));
    console.log('  - generateMelody函数:', typeof window.generateMelody);

    // 开始等待generateMelody
    waitForGenerateMelody();
  }
})();