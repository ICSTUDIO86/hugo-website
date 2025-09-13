/**
 * IC 视奏工具 - 30条旋律严格计数系统
 * 基于服务端验证，刷新无法绕过
 * 每台设备限制生成30条旋律
 */

class MelodyCounterSystem {
  constructor() {
    this.apiEndpoint = 'https://cloud1-4g1r5ho01a0cfd85.service.tcloudbase.com/trialCounter';
    this.isGenerating = false; // 防止重复点击
    this.currentStatus = null;
    this.originalGenerateMelody = null;
    this.initialized = false; // 标记是否已初始化
  }

  // 生成设备指纹（与服务端保持一致）
  generateDeviceFingerprint() {
    console.log('🔍 开始生成设备指纹...');
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

      // WebGL指纹
      const webglFingerprint = this.getWebGLFingerprint();
      fp.push(webglFingerprint);
      console.log('  - WebGL指纹:', webglFingerprint.substring(0, 30) + '...');

      // Canvas指纹
      const canvasFingerprint = this.getCanvasFingerprint();
      fp.push(canvasFingerprint);
      console.log('  - Canvas指纹:', canvasFingerprint.substring(0, 30) + '...');

      const result = fp.join('|');
      console.log('✅ 设备指纹生成完成');
      console.log('  - 总长度:', result.length);
      console.log('  - 组件数量:', fp.length);
      console.log('  - 前100字符:', result.substring(0, 100) + '...');

      // 验证指纹不为空
      if (!result || result.length < 10) {
        throw new Error('生成的指纹过短');
      }

      return result;
    } catch (error) {
      console.error('❌ 设备指纹生成失败:', error);
      // 返回基础指纹作为备用
      const fallbackFingerprint = `${navigator.userAgent || 'unknown'}|${Date.now()}|${Math.random()}`;
      console.log('🔄 使用备用指纹长度:', fallbackFingerprint.length);
      return fallbackFingerprint;
    }
  }

  // Canvas指纹
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

  // WebGL指纹
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

    // icstudio.club及其子域名应该使用服务端模式
    const isICStudio = hostname.includes('icstudio.club');

    // file://协议检测（本地文件）
    const isFileProtocol = protocol === 'file:';

    console.log('  - isLocalhost:', isLocalhost);
    console.log('  - isPrivateIP:', isPrivateIP);
    console.log('  - isICStudio:', isICStudio);
    console.log('  - isFileProtocol:', isFileProtocol);

    // 如果是IC Studio域名，强制使用服务端模式
    if (isICStudio) {
      console.log('🌐 检测到IC Studio域名，使用服务端模式');
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
        allowed: newCount <= 30,
        expired: newCount > 30,
        used: newCount,
        total: 30,
        remaining: Math.max(0, 30 - newCount),
        message: newCount > 30 ? '本地试用次数已用完' : `本地剩余 ${Math.max(0, 30 - newCount)} 条旋律`,
        isLocalMode: true
      };
    }

    return {
      success: true,
      allowed: localUsage < 30,
      expired: localUsage >= 30,
      used: localUsage,
      total: 30,
      remaining: Math.max(0, 30 - localUsage),
      message: localUsage >= 30 ? '本地试用次数已用完' : `本地剩余 ${Math.max(0, 30 - localUsage)} 条旋律`,
      isLocalMode: true
    };
  }

  // 向服务端请求验证和计数
  async requestMelodyGeneration(action = 'check') {
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

    // 根据状态显示不同的信息
    const modePrefix = status.isLocalMode ? '🏠 [本地模式] ' : '';

    if (status.hasFullAccess) {
      statusDiv.style.background = '#e8f5e9';
      statusDiv.style.color = '#2e7d32';
      statusDiv.innerHTML = `✅ ${modePrefix}完整版用户，无限制使用`;
    } else if (status.expired) {
      statusDiv.style.background = '#ffebee';
      statusDiv.style.color = '#c62828';
      statusDiv.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px;">😔 ${modePrefix}试用次数已用完</div>
        <div style="font-size: 12px;">您已生成了 ${status.used || 30} 条旋律</div>
        <div style="font-size: 12px; margin-top: 8px;">${status.isLocalMode ? '本地模式限制' : '请购买完整版继续使用'}</div>
      `;
    } else if (status.error) {
      statusDiv.style.background = '#fff3e0';
      statusDiv.style.color = '#e65100';
      statusDiv.innerHTML = `⚠️ ${status.error}`;
    } else if (status.isFirstTime) {
      statusDiv.style.background = '#e3f2fd';
      statusDiv.style.color = '#1565c0';
      statusDiv.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px;">🎉 ${modePrefix}欢迎试用！</div>
        <div>您有 <strong>${status.total || 30}</strong> 条免费旋律</div>
      `;
    } else {
      const percentage = ((status.used || 0) / (status.total || 30)) * 100;
      const progressColor = percentage > 80 ? '#ff9800' : '#4caf50';

      statusDiv.style.background = '#f5f5f5';
      statusDiv.style.color = '#424242';
      statusDiv.innerHTML = `
        <div style="margin-bottom: 8px;">
          ${modePrefix}已使用: <strong>${status.used || 0}</strong> / ${status.total || 30} 条旋律
        </div>
        <div style="background: #e0e0e0; height: 6px; border-radius: 3px; overflow: hidden;">
          <div style="background: ${progressColor}; width: ${percentage}%; height: 100%; transition: width 0.3s ease;"></div>
        </div>
        <div style="font-size: 12px; margin-top: 8px; color: #757575;">
          剩余: <strong>${status.remaining || 0}</strong> 条
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

    // 创建新的包装函数
    const self = this;
    window.generateMelody = async function() {
      console.log('🎼 用户点击生成旋律按钮');

      // 防止重复点击
      if (self.isGenerating) {
        console.log('⏳ 正在生成中，请稍候...');
        return;
      }

      self.isGenerating = true;

      try {
        // 先检查状态
        const checkResult = await self.requestMelodyGeneration('check');
        self.showCounterStatus(checkResult);

        if (!checkResult.allowed) {
          console.log('🚫 无法生成：', checkResult.message);
          self.updateGenerateButton(checkResult);

          // 显示购买提示
          if (checkResult.expired) {
            self.showPurchasePrompt();
          }
          return;
        }

        // 请求生成权限
        console.log('📝 请求生成权限...');
        const generateResult = await self.requestMelodyGeneration('increment');

        if (!generateResult.allowed && !generateResult.hasFullAccess) {
          console.log('🚫 服务端拒绝生成');
          self.showCounterStatus(generateResult);
          self.updateGenerateButton(generateResult);

          if (generateResult.expired) {
            self.showPurchasePrompt();
          }
          return;
        }

        // 调用原始生成函数（重要：需要await异步函数）
        console.log('✅ 权限验证通过，调用原始generateMelody...');
        if (self.originalGenerateMelody) {
          try {
            // 正确处理异步调用
            const result = await self.originalGenerateMelody.apply(this, arguments);
            console.log('✅ 原始generateMelody执行完成');

            // 更新显示
            self.showCounterStatus(generateResult);

            // 如果是最后一条，显示特别提示
            if (generateResult.remaining === 0 && !generateResult.hasFullAccess) {
              setTimeout(() => {
                alert('🎵 这是您的最后一条免费旋律！\n\n如需继续使用，请购买完整版。');
              }, 1000);
            } else if (generateResult.remaining === 5 && !generateResult.hasFullAccess) {
              // 剩余5条时提醒
              console.log('⚠️ 仅剩5条免费旋律');
            }

            return result;
          } catch (genError) {
            console.error('❌ 原始generateMelody执行失败:', genError);
            throw genError;
          }
        } else {
          console.error('❌ 原始generateMelody函数不存在！');
          throw new Error('原始generateMelody函数不存在');
        }
      } catch (error) {
        console.error('❌ 生成过程出错:', error);
        self.showCounterStatus({
          error: '生成失败，请重试'
        });
        throw error;
      } finally {
        self.isGenerating = false;
        self.updateGenerateButton(self.currentStatus || {});
      }
    };

    // 标记为已包装
    window.generateMelody._isWrapped = true;

    console.log('✅ 旋律计数系统已激活');
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

  // 初始化系统
  async init() {
    // 防止重复初始化
    if (this.initialized) {
      console.log('⚠️ 计数系统已经初始化过了');
      return true;
    }

    console.log('🚀 初始化30条旋律计数系统...');

    try {
      // 检查初始状态
      const status = await this.requestMelodyGeneration('check');
      this.showCounterStatus(status);
      this.updateGenerateButton(status);

      // 包装生成函数
      this.wrapGenerateMelodyFunction();

      // 如果已经过期，显示购买提示
      if (status.expired && !status.hasFullAccess) {
        this.showPurchasePrompt();
      }

      this.initialized = true; // 标记已初始化
      console.log('✅ 计数系统初始化完成');
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