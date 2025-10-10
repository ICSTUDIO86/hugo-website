/**
 * IC 视奏工具 - 权限管理器
 * 已移除时间限制，现在依赖计数器系统进行限制管理
 */

class TrialLimiter {
  constructor() {
    this.storageKey = 'ic-sight-reading-trial';
    this.deviceId = this.generateDeviceId();
  }

  // 生成设备唯一标识（简化版）
  generateDeviceId() {
    let deviceId = localStorage.getItem('ic-device-id');
    if (!deviceId) {
      // 简化的设备指纹
      const fingerprint = this.generateDeviceFingerprint();
      deviceId = this.hashCode(fingerprint).toString(36);

      // 多层存储防护
      localStorage.setItem('ic-device-id', deviceId);
      sessionStorage.setItem('ic-device-id-session', deviceId);

      // 设置一个隐藏的 cookie 作为备用验证
      document.cookie = `ic_device_backup=${deviceId}; path=/; max-age=${365*24*60*60}; SameSite=Strict`;
    }
    return deviceId;
  }

  // 生成简化的设备指纹
  generateDeviceFingerprint() {
    const fp = [];

    // 基础浏览器信息
    fp.push(navigator.userAgent);
    fp.push(navigator.language);
    fp.push(navigator.platform);
    fp.push(navigator.cookieEnabled);

    // 屏幕信息
    fp.push(screen.width + 'x' + screen.height);
    fp.push(screen.colorDepth);
    fp.push(window.devicePixelRatio || 'unknown');

    // 时区信息
    fp.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
    fp.push(new Date().getTimezoneOffset());

    return fp.join('|');
  }

  // 简单哈希函数
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash);
  }

  // 检查权限状态（集成计数器系统限制）
  checkTrialStatus() {
    // 检查是否有有效的访问码
    const hasValidAccess = this.hasValidAccessCode();
    if (hasValidAccess) {
      console.log('✅ 检测到有效访问码，完整版用户');
      return {
        allowed: true,
        hasAccess: true,
        reason: 'valid-access-code'
      };
    }

    // 检查是否在豁免期内
    const exemptTime = localStorage.getItem('ic-anticheat-exempt');
    const inExemptPeriod = exemptTime && (Date.now() - parseInt(exemptTime) < 5 * 60 * 1000);

    if (inExemptPeriod) {
      console.log('🛡️ 豁免期内，允许使用');
      return {
        allowed: true,
        inExemptPeriod: true,
        exemptMode: true
      };
    }

    // 检查计数器系统状态（如果已加载）
    if (window.melodyCounterSystem && window.melodyCounterSystem.currentStatus) {
      const counterStatus = window.melodyCounterSystem.currentStatus;
      console.log('📊 使用计数器系统状态:', counterStatus);
      return {
        allowed: counterStatus.allowed || false,
        hasAccess: counterStatus.hasFullAccess || false,
        reason: 'counter-system',
        remaining: counterStatus.remaining,
        total: counterStatus.total,
        expired: counterStatus.expired
      };
    }

    // 计数器系统未加载时，允许使用（等待计数器系统初始化）
    console.log('⏳ 计数器系统尚未加载，暂时允许使用');
    return {
      allowed: true,
      reason: 'counter-system-loading',
      message: '正在加载试用限制系统...'
    };
  }

  // 检查用户是否有有效的访问码
  hasValidAccessCode() {
    try {
      // 检查CloudBase API存储的访问码
      const accessData = localStorage.getItem('ic-premium-access');
      if (accessData) {
        const data = JSON.parse(accessData);
        if (data && data.code && data.code.length === 12 && data.serverVerified) {
          return true;
        }
      }

      // 检查其他访问码存储位置
      const sightReadingLicense = localStorage.getItem('ic-sight-reading-license');
      if (sightReadingLicense) {
        return true;
      }

      // 检查其他完整版标记
      if (localStorage.getItem('ic-verified-user') === 'true' ||
          localStorage.getItem('ic-full-access') === 'true') {
        return true;
      }

      return false;
    } catch (error) {
      console.error('访问码检查失败:', error);
      return false;
    }
  }

  // 显示权限状态（简化版）
  showTrialStatus(status) {
    const statusElement = document.getElementById('trial-status');
    if (!statusElement) return;

    this.updateTrialStatusDisplay(status);

    // 如果用户有访问码，隐藏试用相关界面
    if (status.hasAccess) {
      statusElement.style.display = 'none';

      // 也隐藏访问码输入区域和支付区域
      const accessCodeContainer = document.getElementById('access-code-container');
      const zpayContainer = document.getElementById('zpay-container');

      if (accessCodeContainer) {
        accessCodeContainer.style.display = 'none';
      }
      if (zpayContainer) {
        zpayContainer.style.display = 'none';
      }

      console.log('✅ 完整版用户，已隐藏所有付费相关界面');
    } else {
      this.ensureAccessCodeArea();
    }
  }

  // 更新试用状态显示（简化版）
  updateTrialStatusDisplay(status) {
    const statusElement = document.getElementById('trial-status');
    if (!statusElement) return;

    // 查找或创建状态显示区域
    let statusDisplayDiv = statusElement.querySelector('#trial-status-display');
    if (!statusDisplayDiv) {
      statusDisplayDiv = document.createElement('div');
      statusDisplayDiv.id = 'trial-status-display';
      statusElement.appendChild(statusDisplayDiv);
    }

    let statusContent = '';

    if (status.hasAccess) {
      statusContent = `
        <div class="trial-active">
          <h3 style="color: #27ae60;">✅ 完整版已激活</h3>
          <p style="color: #27ae60;">享受所有高级功能</p>
        </div>
      `;
    } else if (status.inExemptPeriod) {
      statusContent = `
        <div class="trial-active">
          <h3 style="color: #3498db;">🛡️ 访问码验证中</h3>
          <p style="color: #3498db;">正在验证您的权限...</p>
        </div>
      `;

    statusDisplayDiv.innerHTML = statusContent;
  }

  // 初始化权限管理器（简化版）
  async init() {
    // 检查早期权限检测结果
    if (window.IC_EARLY_PREMIUM_DETECTED === true) {
      console.log('🚀 Trial-Limiter: 早期检测到完整版用户，跳过试用设置');
      this.ensureToolAccess();
      // 不显示任何试用状态，完整版用户不需要看到
      return true;
    }

    const status = this.checkTrialStatus();

    if (status.hasAccess) {
      console.log('✅ 用户拥有完整版权限，无需限制');
      this.ensureToolAccess();
      this.showTrialStatus(status);
      return true;
    }

    // 确保试用期间工具可用 - 现在依赖计数器系统管理
    setTimeout(() => {
      this.ensureToolAccess();
      console.log('🔄 页面加载后工具已启用，由计数器系统管理限制');
    }, 100);

    this.showTrialStatus(status);
    return true;
  }

  // 确保工具可用（保持不变）
  ensureToolAccess() {
    console.log('🔓 确保视奏工具完全可用');

    // 1. 确保工具界面可见
    const toolContainer = document.querySelector('.sight-reading-tool');
    if (toolContainer) {
      toolContainer.style.display = 'block';
      toolContainer.style.opacity = '1';
      toolContainer.style.pointerEvents = 'auto';
      console.log('✅ 视奏工具界面已启用');
    }

    // 2. 确保生成按钮可用并恢复正常文本
    const generateBtn = document.getElementById('generateBtn') ||
                       document.querySelector('button[onclick*="generateMelody"]') ||
                       document.querySelector('button.btn-primary');
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.style.opacity = '1';
      generateBtn.style.cursor = 'pointer';
      generateBtn.style.pointerEvents = 'auto';
      generateBtn.removeAttribute('disabled');

      // 恢复按钮正常文本
      generateBtn.textContent = '生成旋律';
      generateBtn.innerHTML = '生成旋律';

      console.log('✅ 生成按钮已完全启用');
    }

    // 3. 确保所有输入控件可用
    const allInputs = document.querySelectorAll('input, select, button, textarea');
    allInputs.forEach(input => {
      if (input.id !== 'generateBtn') {
        input.disabled = false;
        input.style.opacity = '1';
        input.style.pointerEvents = 'auto';
      }
    });
    console.log('✅ 所有输入控件已启用');

    // 4. 移除可能的访问限制覆盖层
    const overlays = document.querySelectorAll('.access-overlay, .trial-overlay, .premium-overlay');
    overlays.forEach(overlay => overlay.remove());

    // 5. 确保没有全局权限检查函数阻止使用
    if (window.checkFullAccess) {
      // 覆盖权限检查，集成计数器系统限制
      const originalCheck = window.checkFullAccess;
      window.checkFullAccess = function() {
        // 如果有有效访问码，返回 true
        if (window.trialLimiter && window.trialLimiter.hasValidAccessCode()) {
          return true;
        }
        // 如果在豁免期内，返回 true
        const exemptTime = localStorage.getItem('ic-anticheat-exempt');
        if (exemptTime && (Date.now() - parseInt(exemptTime) < 5 * 60 * 1000)) {
          return true;
        }
        // 检查计数器系统状态
        if (window.melodyCounterSystem && window.melodyCounterSystem.currentStatus) {
          return window.melodyCounterSystem.currentStatus.allowed || false;
        }
        // 如果计数器系统未加载，返回 false 以启用限制
        return false;
      };
      console.log('✅ 权限检查已集成计数器系统限制');
    }

    console.log('🎉 工具完全可用状态已确保');
  }
}

// 全局实例
window.trialLimiter = new TrialLimiter();

// 清理旧的时间相关存储
function cleanupTimeBasedStorage() {
  console.log('🧹 清理旧的时间限制相关存储...');

  const timeRelatedKeys = [
    'trial-start-time',
    'trial-used-time',
    'trial-end-time',
    'ic-sight-reading-trial-time',
    'trial-duration',
    'remaining-time'
  ];

  let cleanedCount = 0;
  timeRelatedKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      cleanedCount++;
    }
  });

  if (cleanedCount > 0) {
    console.log(`✅ 已清理 ${cleanedCount} 个时间相关的存储项`);
  } else {
    console.log('✅ 无需清理时间相关存储');
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  if (window.location.pathname.includes('sight-reading-generator') ||
      document.querySelector('.sight-reading-tool')) {

    // 清理旧的时间相关存储
    cleanupTimeBasedStorage();

    // 检查是否有有效的访问码
    const hasValidAccess = window.trialLimiter.hasValidAccessCode();
    console.log('🔄 启动权限管理器（已移除时间限制）...');
    window.trialLimiter.init();

    if (hasValidAccess) {
      console.log('✅ 检测到有效访问码，完整版用户');
    } else {
      console.log('💡 普通用户，现在由计数器系统管理使用限制');
    }
  }
});