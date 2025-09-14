/**
 * IC 视奏工具 - 严格试用系统
 * 基于服务端验证，无绕过机制
 * 每台设备限制试用 10 分钟，即使重新部署也无法绕过
 */

class StrictTrialSystem {
  constructor() {
    this.apiEndpoint = 'https://cloud1-4g1r5ho01a0cfd85.service.tcloudbase.com/validateTrial';
    this.verificationInterval = null;
    this.lastValidation = 0;
    this.validationFrequency = 30000; // 30秒验证一次
  }

  // 生成稳定的设备指纹（增强版）
  generateDeviceFingerprint() {
    const fp = [];

    // 基础浏览器信息
    fp.push(navigator.userAgent);
    fp.push(navigator.language || 'unknown');
    fp.push((navigator.languages || []).join(',') || 'unknown');
    fp.push(navigator.platform || 'unknown');
    fp.push(navigator.cookieEnabled);

    // 屏幕信息
    fp.push(`${screen.width}x${screen.height}`);
    fp.push(screen.colorDepth || 'unknown');
    fp.push(screen.pixelDepth || 'unknown');
    fp.push(window.devicePixelRatio || 'unknown');

    // 时区信息
    try {
      fp.push(Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown');
    } catch (e) {
      fp.push('unknown');
    }
    fp.push(new Date().getTimezoneOffset());

    // 硬件信息
    fp.push(navigator.hardwareConcurrency || 'unknown');
    fp.push(navigator.maxTouchPoints || 0);
    fp.push(navigator.deviceMemory || 'unknown');

    // WebGL 指纹
    fp.push(this.getWebGLFingerprint());

    // Canvas 指纹
    fp.push(this.getCanvasFingerprint());

    return fp.join('|');
  }

  // Canvas 指纹
  getCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('IC Studio Device ID', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Fingerprint 2024', 4, 45);

      return canvas.toDataURL().slice(-50);
    } catch (e) {
      return 'canvas_error';
    }
  }

  // WebGL 指纹
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

  // 服务端验证试用状态
  async validateTrialWithServer() {
    try {
      const deviceFingerprint = this.generateDeviceFingerprint();
      const timestamp = Date.now();

      console.log('🔒 向服务端验证试用状态...');

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceFingerprint: deviceFingerprint,
          timestamp: timestamp,
          userAgent: navigator.userAgent
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('📊 服务端验证结果:', {
        valid: result.valid,
        remaining: result.remaining,
        message: result.message
      });

      this.lastValidation = Date.now();
      return result;

    } catch (error) {
      console.error('❌ 服务端验证失败:', error);
      // 验证失败时，出于安全考虑，拒绝访问
      return {
        valid: false,
        error: '网络连接异常，无法验证试用状态',
        remaining: 0
      };
    }
  }

  // 显示试用状态
  showTrialStatus(status) {
    const statusElement = document.getElementById('trial-status');
    if (!statusElement) return;

    let statusContent = '';

    if (status.error) {
      statusContent = `
        <div class="trial-error" style="padding: 20px; border: 2px solid #e74c3c; border-radius: 8px; background: #fdf2f2; color: #e74c3c; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">⚠️ 验证失败</h3>
          <p style="margin: 0;">${status.error}</p>
        </div>
      `;
    } else if (status.valid === false) {
      statusContent = `
        <div class="trial-expired" style="padding: 20px; border: 2px solid #e74c3c; border-radius: 8px; background: #fdf2f2; color: #e74c3c; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">😔 试用时间已用完</h3>
          <p style="margin: 0; font-size: 14px;">每台设备可免费试用 10 分钟</p>
        </div>
      `;
    } else if (status.isFirstTime) {
      statusContent = `
        <div class="trial-welcome" style="padding: 20px; border: 2px solid #27ae60; border-radius: 8px; background: #f8fff8; color: #27ae60; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">🎉 欢迎试用 IC 视奏工具！</h3>
          <p style="margin: 0; font-size: 14px;">您有 <strong>10 分钟</strong> 的免费试用时间</p>
        </div>
      `;
    } else if (status.valid) {
      const remaining = this.formatTime(status.remaining);
      statusContent = `
        <div class="trial-active" style="padding: 20px; border: 2px solid #3498db; border-radius: 8px; background: #f8fcff; color: #3498db; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">⏰ 试用剩余时间：<strong>${remaining}</strong></h3>
          <p style="margin: 0; font-size: 12px; color: #7f8c8d;">试用状态每30秒自动更新</p>
        </div>
      `;
    }

    // 总是显示访问码输入区域
    statusContent += this.getAccessCodeArea();

    statusElement.innerHTML = statusContent;
  }

  // 获取访问码输入区域HTML
  getAccessCodeArea() {
    return `
      <div style="margin-top: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #fafafa;">
        <h3 style="color: #667eea; margin-bottom: 15px; font-size: 16px;">输入访问码</h3>
        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
          <input type="text" id="access-code-input" placeholder="输入访问码(11-12位)"
                 style="flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; text-transform: uppercase;"
                 maxlength="12">
          <button onclick="window.strictTrialSystem.verifyAccessCode()"
                  style="padding: 12px 20px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
            验证
          </button>
        </div>
        <div id="verify-result" style="font-size: 14px; min-height: 20px;"></div>
        <div style="text-align: center; margin-top: 10px;">
          <button onclick="window.strictTrialSystem.showForgotCodeDialog()"
                  style="background: none; border: none; color: #888; font-size: 14px; text-decoration: underline; cursor: pointer; padding: 8px;">
            忘记访问码？点击找回
          </button>
        </div>
      </div>
    `;
  }

  // 验证访问码（委托给现有系统）
  async verifyAccessCode() {
    const input = document.getElementById('access-code-input');
    const resultDiv = document.getElementById('verify-result');

    if (!input || !input.value.trim()) {
      if (resultDiv) {
        resultDiv.innerHTML = '<div style="color: #e74c3c;">请输入访问码</div>';
      }
      return;
    }

    if (window.verifyAccessCodeWithServer) {
      await window.verifyAccessCodeWithServer();
    } else if (resultDiv) {
      resultDiv.innerHTML = '<div style="color: #e74c3c;">访问码验证功能未加载</div>';
    }
  }

  // 显示找回访问码对话框
  showForgotCodeDialog() {
    if (window.showForgotCodeDialog) {
      window.showForgotCodeDialog();
    } else {
      alert('找回访问码功能正在开发中，请联系客服');
    }
  }

  // 格式化剩余时间
  formatTime(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // 启用工具访问
  enableToolAccess() {
    console.log('✅ 启用视奏工具访问');

    // 确保工具界面可见
    const toolContainer = document.querySelector('.sight-reading-tool');
    if (toolContainer) {
      toolContainer.style.display = 'block';
      toolContainer.style.opacity = '1';
      toolContainer.style.pointerEvents = 'auto';
    }

    // 确保生成按钮可用
    const generateBtn = document.getElementById('generateBtn') ||
                       document.querySelector('button[onclick*="generateMelody"]') ||
                       document.querySelector('button.btn-primary');
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.style.opacity = '1';
      generateBtn.style.cursor = 'pointer';
      generateBtn.style.pointerEvents = 'auto';
      generateBtn.textContent = '生成旋律';
      generateBtn.innerHTML = '生成旋律';
    }

    // 确保所有输入控件可用
    const allInputs = document.querySelectorAll('input, select, button, textarea');
    allInputs.forEach(input => {
      if (input.id !== 'generateBtn') {
        input.disabled = false;
        input.style.opacity = '1';
        input.style.pointerEvents = 'auto';
      }
    });

    // 隐藏支付区域
    const paymentSection = document.getElementById('zpay-container');
    if (paymentSection) {
      paymentSection.style.display = 'none';
    }
  }

  // 禁用工具访问
  disableToolAccess() {
    console.log('🚫 禁用视奏工具访问');

    // 修改生成按钮
    const generateBtn = document.getElementById('generateBtn') ||
                       document.querySelector('button[onclick*="generateMelody"]') ||
                       document.querySelector('button.btn-primary');
    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.textContent = '试用已结束';
      generateBtn.innerHTML = '试用已结束';
      generateBtn.style.opacity = '0.5';
      generateBtn.style.cursor = 'not-allowed';
    }

    // 显示支付区域
    const paymentSection = document.getElementById('zpay-container');
    if (paymentSection) {
      paymentSection.style.display = 'block';
    }
  }

  // 启动验证循环
  startVerificationLoop(initialStatus) {
    // 显示初始状态
    this.showTrialStatus(initialStatus);

    if (initialStatus.valid) {
      this.enableToolAccess();
    } else {
      this.disableToolAccess();
      return; // 试用已结束，不启动循环
    }

    // 启动定期验证
    this.verificationInterval = setInterval(async () => {
      const status = await this.validateTrialWithServer();
      this.showTrialStatus(status);

      if (status.valid) {
        this.enableToolAccess();
      } else {
        this.disableToolAccess();
        clearInterval(this.verificationInterval);
        this.verificationInterval = null;
      }
    }, this.validationFrequency);

    console.log('🔄 启动试用验证循环，每30秒验证一次');
  }

  // 初始化严格试用系统
  async init() {
    console.log('🔒 初始化严格试用系统...');

    // 检查是否有有效访问码，如果有则跳过试用限制
    if (window.checkFullAccess && window.checkFullAccess()) {
      console.log('✅ 检测到有效访问码，跳过试用限制');
      return true;
    }

    try {
      const status = await this.validateTrialWithServer();
      this.startVerificationLoop(status);

      return status.valid;
    } catch (error) {
      console.error('❌ 试用系统初始化失败:', error);
      this.showTrialStatus({
        valid: false,
        error: '试用系统初始化失败，请刷新页面重试'
      });
      this.disableToolAccess();
      return false;
    }
  }

  // 清理资源
  destroy() {
    if (this.verificationInterval) {
      clearInterval(this.verificationInterval);
      this.verificationInterval = null;
    }
  }
}

// 全局实例
window.strictTrialSystem = new StrictTrialSystem();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  if (window.location.pathname.includes('sight-reading-generator') ||
      document.querySelector('.sight-reading-tool')) {

    console.log('🚀 启动严格试用系统...');
    window.strictTrialSystem.init();
  }
});

// 页面卸载时清理资源
window.addEventListener('beforeunload', function() {
  if (window.strictTrialSystem) {
    window.strictTrialSystem.destroy();
  }
});