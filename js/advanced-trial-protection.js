/**
 * IC Studio 高级试用保护系统
 * 防止无痕浏览模式和其他绕过手段
 */

class AdvancedTrialProtection {
  constructor() {
    this.serverEndpoint = 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/trialVerification';
    this.maxTrialUsage = 20; // 正常模式最大试用次数（无痕模式为3次）
    this.deviceFingerprint = null;
    this.sessionId = this.generateSessionId();
    this.protectionLevel = 'high'; // high, medium, low
    this.serverVerificationDisabled = false;
  }

  getCounterSystem() {
    return window.melodyCounterSystem || window.melodyCounter || null;
  }

  // 生成高强度设备指纹
  async generateAdvancedFingerprint() {
    const fingerprint = [];

    try {
      // 基础信息
      fingerprint.push(navigator.userAgent);
      fingerprint.push(navigator.language);
      fingerprint.push(navigator.languages?.join(',') || 'unknown');
      fingerprint.push(navigator.platform);
      fingerprint.push(navigator.hardwareConcurrency || 'unknown');
      fingerprint.push(navigator.deviceMemory || 'unknown');

      // 屏幕信息
      fingerprint.push(`${screen.width}x${screen.height}`);
      fingerprint.push(screen.colorDepth);
      fingerprint.push(screen.pixelDepth);
      fingerprint.push(window.devicePixelRatio || 'unknown');

      // 时区和地理信息
      fingerprint.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
      fingerprint.push(new Date().getTimezoneOffset());

      // Canvas 指纹
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('IC Studio Fingerprint Test 123!@#', 2, 2);
      fingerprint.push(canvas.toDataURL());

      // WebGL 指纹
      const webglCanvas = document.createElement('canvas');
      const gl = webglCanvas.getContext('webgl') || webglCanvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          fingerprint.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
          fingerprint.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
        }
      }

      // 网络信息
      if (navigator.connection) {
        fingerprint.push(navigator.connection.effectiveType || 'unknown');
        fingerprint.push(navigator.connection.downlink || 'unknown');
      }

      // 存储估计
      if (navigator.storage && navigator.storage.estimate) {
        const storage = await navigator.storage.estimate();
        fingerprint.push(storage.quota || 'unknown');
      }

      // 媒体设备
      if (navigator.mediaDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          fingerprint.push(devices.length.toString());
        } catch (e) {
          fingerprint.push('media-access-denied');
        }
      }

    } catch (error) {
      console.error('指纹生成部分失败:', error);
      fingerprint.push('fingerprint-error');
    }

    const rawFingerprint = fingerprint.join('|');
    this.deviceFingerprint = this.hashCode(rawFingerprint);

    console.log('🔒 高级设备指纹生成完成:', this.deviceFingerprint);
    return this.deviceFingerprint;
  }

  // 增强的哈希函数
  hashCode(str) {
    let hash = 0;
    if (str.length === 0) return hash;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }

    // 确保为正数
    return Math.abs(hash).toString(36);
  }

  // 生成会话ID
  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // 检测无痕浏览模式
  async detectIncognitoMode() {
    return new Promise((resolve) => {
      // 方法1: 检查 localStorage 配额
      try {
        const testKey = '__incognito_test__';
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);

        // 方法2: 检查 indexedDB
        if ('webkitRequestFileSystem' in window) {
          window.webkitRequestFileSystem(
            window.TEMPORARY, 1,
            () => resolve(false), // 非无痕模式
            () => resolve(true)   // 无痕模式
          );
        } else if ('MozAppearance' in document.documentElement.style) {
          // Firefox 检测
          const db = indexedDB.open('test');
          db.onerror = () => resolve(true);
          db.onsuccess = () => resolve(false);
        } else {
          // 其他浏览器的检测方法
          resolve(false);
        }
      } catch (e) {
        resolve(true); // 可能是无痕模式
      }
    });
  }

  // 检查是否为本地开发环境
  isLocalDevelopment() {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isPrivateIP = hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.');
    const isProduction = hostname.includes('icstudio.club') || hostname.includes('github.io');

    if (isProduction) {
      return false;
    }

    return isLocalhost || isPrivateIP;
  }

  // 服务器端验证试用状态
  async verifyTrialWithServer(fingerprint, action = 'check') {
    try {
      // 本地开发环境直接使用本地验证
      if (this.isLocalDevelopment()) {
        console.log('🏠 本地开发环境，使用本地验证');
        return this.fallbackLocalVerification(fingerprint, action);
      }

      if (this.serverVerificationDisabled) {
        console.warn('⚠️ 服务器验证已在当前会话中禁用，直接使用本地回退验证');
        return this.fallbackLocalVerification(fingerprint, action);
      }

      // 检测无痕模式
      const isIncognito = await this.detectIncognitoMode();

      const requestData = {
        fingerprint: fingerprint,
        sessionId: this.sessionId,
        action: action, // 'check', 'use', 'reset'
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer || 'direct',
        isIncognito: isIncognito
      };

      console.log(`🔍 服务器端试用验证 - 动作: ${action}, 无痕模式: ${isIncognito}`);

      const response = await fetch(this.serverEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Source': 'IC-Studio-Trial-Protection'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`服务器错误: ${response.status}`);
      }

      const rawResult = await response.json();
      const result = typeof rawResult.body === 'string' ? JSON.parse(rawResult.body) : rawResult;
      console.log('📊 服务器验证结果:', result);

      return result;
    } catch (error) {
      console.error('❌ 服务器验证失败:', error);
      this.serverVerificationDisabled = true;

      // 回退到本地验证（降级处理）
      return this.fallbackLocalVerification(fingerprint, action);
    }
  }

  // 获取无痕模式试用使用次数
  getIncognitoTrialUsage() {
    try {
      // 使用sessionStorage存储无痕模式计数（页面关闭后重置）
      const key = 'ic_incognito_trial_count';
      let count = parseInt(sessionStorage.getItem(key) || '0');
      return count;
    } catch (e) {
      // 如果sessionStorage不可用，使用内存计数
      if (!window._incognitoTrialCount) window._incognitoTrialCount = 0;
      return window._incognitoTrialCount;
    }
  }

  // 增加无痕模式试用使用次数
  incrementIncognitoTrialUsage() {
    try {
      const key = 'ic_incognito_trial_count';
      let count = parseInt(sessionStorage.getItem(key) || '0') + 1;
      sessionStorage.setItem(key, count.toString());
      return count;
    } catch (e) {
      // 回退到内存计数
      if (!window._incognitoTrialCount) window._incognitoTrialCount = 0;
      window._incognitoTrialCount++;
      return window._incognitoTrialCount;
    }
  }

  // 本地回退验证
  fallbackLocalVerification(fingerprint, action) {
    console.log('🔄 使用本地回退验证');

    const storageKey = `ic_trial_${fingerprint}`;
    let usageData = localStorage.getItem(storageKey);

    if (!usageData) {
      usageData = { count: 0, firstUse: Date.now(), lastUse: Date.now() };
    } else {
      try {
        usageData = JSON.parse(usageData);
      } catch (e) {
        usageData = { count: 0, firstUse: Date.now(), lastUse: Date.now() };
      }
    }

    if (action === 'use') {
      usageData.count++;
      usageData.lastUse = Date.now();
      localStorage.setItem(storageKey, JSON.stringify(usageData));
    }

    const remainingTrial = Math.max(0, this.maxTrialUsage - usageData.count);

    return {
      success: true,
      allowed: remainingTrial > 0,
      remainingTrial: remainingTrial,
      usageCount: usageData.count,
      maxUsage: this.maxTrialUsage,
      source: 'local-fallback'
    };
  }

  // 主要的试用检查方法
  async checkTrialAccess() {
    try {
      if (this.isLocalDevelopment()) {
        return {
          allowed: true,
          hasFullAccess: true,
          reason: 'local-development'
        };
      }

      // 1. 首先检查是否有完整版权限
      if (this.hasFullAccess()) {
        console.log('✅ 用户拥有完整版权限');
        return {
          allowed: true,
          hasFullAccess: true,
          reason: 'premium-user'
        };
      }

      // 2. 检查现有的计数器系统状态
      const counterSystem = this.getCounterSystem();
      if (counterSystem && typeof counterSystem.checkStatus === 'function') {
        const counterStatus = await counterSystem.checkStatus();
        if (!counterStatus.allowed) {
          console.log('🚫 计数器系统限制：20条旋律已用完');
          return {
            allowed: false,
            reason: 'melody-limit-exceeded',
            message: '您的20条免费旋律已用完。请购买完整版继续使用。',
            source: 'melody-counter'
          };
        }
      }

      // 3. 生成设备指纹
      if (!this.deviceFingerprint) {
        await this.generateAdvancedFingerprint();
      }

      // 4. 检测无痕模式
      const isIncognito = await this.detectIncognitoMode();
      if (isIncognito) {
        console.log('🕵️ 检测到无痕浏览模式 - 限制3次试用');

        // 无痕模式下使用3次限制
        const incognitoTrialUsage = this.getIncognitoTrialUsage();
        if (incognitoTrialUsage >= 3) {
          return {
            allowed: false,
            reason: 'trial-exceeded-incognito',
            message: '您在无痕浏览模式下的试用次数已用完（限制3次）。请购买完整版或切换到普通浏览模式。',
            isIncognito: true,
            usageCount: incognitoTrialUsage,
            maxUsage: 3
          };
        }
      }

      // 5. 服务器端验证（正常模式）
      const verificationResult = await this.verifyTrialWithServer(this.deviceFingerprint, 'check');

      return {
        allowed: verificationResult.allowed,
        remainingTrial: verificationResult.remainingTrial,
        usageCount: verificationResult.usageCount,
        maxUsage: verificationResult.maxUsage,
        isIncognito: false,
        fingerprint: this.deviceFingerprint,
        source: verificationResult.source || 'server'
      };

    } catch (error) {
      console.error('❌ 试用检查失败:', error);

      // 发生错误时允许使用（用户友好）
      return {
        allowed: true,
        reason: 'verification-error',
        error: error.message
      };
    }
  }

  // 记录试用使用
  async recordTrialUsage() {
    if (this.isLocalDevelopment() || this.hasFullAccess()) {
      return { success: true, reason: 'premium-user' };
    }

    try {
      // 检测无痕模式
      const isIncognito = await this.detectIncognitoMode();
      if (isIncognito) {
        console.log('🕵️ 无痕模式：记录本地使用次数');
        const newCount = this.incrementIncognitoTrialUsage();
        return {
          success: true,
          usageCount: newCount,
          maxUsage: 3,
          remainingTrial: Math.max(0, 3 - newCount),
          isIncognito: true,
          source: 'incognito-local'
        };
      }

      // 正常模式：使用服务器端验证
      if (!this.deviceFingerprint) {
        await this.generateAdvancedFingerprint();
      }

      const result = await this.verifyTrialWithServer(this.deviceFingerprint, 'use');
      console.log('📝 试用使用已记录:', result);

      return result;
    } catch (error) {
      console.error('❌ 记录试用使用失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 检查是否有完整版权限
  hasFullAccess() {
    try {
      // 检查各种可能的完整版标记
      const premiumAccess = localStorage.getItem('ic-premium-access');
      if (premiumAccess) {
        const data = JSON.parse(premiumAccess);
        if (data && data.code && data.serverVerified) {
          return true;
        }
      }

      // 检查其他权限标记
      const otherChecks = [
        'ic-sight-reading-license',
        'ic-verified-user',
        'ic-full-access'
      ];

      for (const key of otherChecks) {
        if (localStorage.getItem(key)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('权限检查失败:', error);
      return false;
    }
  }

  displayTrialStatus(status) {
    const statusElement = document.getElementById('trial-status');
    if (!statusElement) return;

    if (!status || status.hasFullAccess) {
      statusElement.style.display = 'none';
      this.hidePurchaseInterface();
      return;
    }

    if (status.allowed) {
      statusElement.style.display = 'none';
      return;
    }

    statusElement.innerHTML = `
      <div class="trial-expired">
        <h3 style="color:#e74c3c;margin:0 0 8px;">⏰ 试用已结束</h3>
        <p style="color:#e74c3c;margin:0;">${status.message || '您的试用次数已用完，请购买完整版继续使用。'}</p>
      </div>
    `;
    statusElement.style.display = 'block';
  }


  // 隐藏购买界面（完整版用户）
  hidePurchaseInterface() {
    const selectors = [
      '#zpay-container',
      '#access-code-container',
      '.payment-section',
      '#trial-status'
    ];

    selectors.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.style.display = 'none';
      }
    });

    console.log('🎉 完整版用户，已隐藏购买界面');
  }

  // 初始化保护系统
  async init() {
    console.log('🚀 启动高级试用保护系统');

    const status = await this.checkTrialAccess();
    this.displayTrialStatus(status);

    // 如果不允许使用，禁用工具
    if (!status.allowed && !status.hasFullAccess) {
      this.disableTool();
    }

    return status;
  }

  // 禁用工具
  disableTool() {
    console.log('🔒 禁用试用工具');

    // 禁用生成按钮
    const generateBtn = document.querySelector('#generateBtn, button[onclick*="generateMelody"], button[onclick*="generateIntervals"], button[onclick*="generatePianoChords"], button[onclick*="generateChords"]');
    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.style.opacity = '0.5';
      generateBtn.textContent = '试用已结束 - 请购买完整版';
      generateBtn.onclick = null;
    }

    // 添加覆盖层
    const toolContainer = document.querySelector('.sight-reading-tool');
    if (toolContainer) {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        text-align: center;
        padding: 20px;
      `;
      overlay.innerHTML = `
        <div>
          <h3>试用已结束</h3>
          <p>请购买完整版继续使用所有功能</p>
          <button onclick="document.querySelector('#zpay-btn').scrollIntoView()"
                  style="background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
            立即购买
          </button>
        </div>
      `;

      toolContainer.style.position = 'relative';
      toolContainer.appendChild(overlay);
    }
  }
}

// 全局实例
window.advancedTrialProtection = new AdvancedTrialProtection();

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
  if (window.location.pathname.includes('sight-reading') ||
      document.querySelector('.sight-reading-tool')) {

    console.log('🔄 初始化高级试用保护系统...');
    window.advancedTrialProtection.init();
  }
});

// 导出以供其他脚本使用
window.checkAdvancedTrialAccess = () => window.advancedTrialProtection.checkTrialAccess();
window.recordAdvancedTrialUsage = () => window.advancedTrialProtection.recordTrialUsage();
