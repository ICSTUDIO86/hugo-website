/**
 * IC Studio 集成试用管理器
 * 结合高级保护系统和旋律计数器系统
 * 防止无痕模式和其他绕过手段
 */

class IntegratedTrialManager {
  constructor() {
    this.initialized = false;
    this.status = null;
  }

  getCounterSystem() {
    return window.melodyCounterSystem || window.melodyCounter || null;
  }

  // 等待其他系统加载完成
  async waitForSystems() {
    let attempts = 0;
    const maxAttempts = 50; // 5秒

    while (attempts < maxAttempts) {
      if (window.advancedTrialProtection && this.getCounterSystem()) {
        console.log('✅ 所有试用管理系统已就绪');
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    console.warn('⚠️ 部分试用管理系统未能及时加载');
    return false;
  }

  // 综合检查试用状态
  async checkTrialStatus() {
    try {
      // 1. 完整版用户检查
      if (this.hasFullAccess()) {
        console.log('🎉 完整版用户，无需限制');
        return {
          allowed: true,
          hasFullAccess: true,
          reason: 'premium-user'
        };
      }

      // 2. 旋律计数器检查（20条限制）
      const counterSystem = this.getCounterSystem();
      if (counterSystem && typeof counterSystem.checkStatus === 'function') {
        const counterStatus = await counterSystem.checkStatus();
        if (!counterStatus.allowed) {
          console.log('🚫 旋律计数器：20条免费旋律已用完');
          return {
            allowed: false,
            reason: 'melody-limit-exceeded',
            message: '您的20条免费旋律已用完。请购买完整版继续使用。',
            remainingMelodies: 0,
            totalMelodies: 20,
            source: 'melody-counter'
          };
        }

        console.log(`✅ 旋律计数器检查通过，剩余：${counterStatus.remaining}/20`);
      }

      // 3. 高级设备保护检查
      if (window.advancedTrialProtection) {
        const protectionStatus = await window.advancedTrialProtection.checkTrialAccess();

        if (!protectionStatus.allowed && !protectionStatus.hasFullAccess) {
          console.log('🛡️ 高级保护系统阻止访问');
          return {
            allowed: false,
            reason: protectionStatus.reason,
            message: protectionStatus.message || '试用限制已达到',
            isIncognito: protectionStatus.isIncognito,
            source: 'advanced-protection'
          };
        }

        console.log('✅ 高级保护系统检查通过');
      }

      // 4. 综合状态
      const melodyStatus = counterSystem && typeof counterSystem.checkStatus === 'function'
        ? await counterSystem.checkStatus()
        : { remaining: 20, total: 20 };

      return {
        allowed: true,
        hasFullAccess: false,
        remainingMelodies: melodyStatus.remaining || 0,
        totalMelodies: melodyStatus.total || 20,
        source: 'integrated-check'
      };

    } catch (error) {
      console.error('❌ 综合试用检查失败:', error);

      // 错误时允许使用（用户友好）
      return {
        allowed: true,
        reason: 'check-error',
        error: error.message
      };
    }
  }

  // 检查完整版权限
  hasFullAccess() {
    try {
      // 检查各种权限标记
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

      // 检查早期检测结果
      if (window.IC_PREMIUM_USER === true || window.IC_EARLY_PREMIUM_DETECTED === true) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('权限检查失败:', error);
      return false;
    }
  }

  // 记录旋律生成
  async recordMelodyGeneration() {
    if (this.hasFullAccess()) {
      console.log('✅ 完整版用户，直接允许生成');
      return { success: true, reason: 'premium-user' };
    }

    try {
      // 使用旋律计数器记录
      const counterSystem = this.getCounterSystem();
      if (counterSystem && typeof counterSystem.recordGeneration === 'function') {
        const result = await counterSystem.recordGeneration();

        if (!result.success) {
          return {
            success: false,
            reason: 'melody-limit-exceeded',
            message: '您的免费旋律已用完，请购买完整版'
          };
        }

        console.log('✅ 旋律生成已记录');
        return result;
      }

      // 备用：使用高级保护系统记录
      if (window.advancedTrialProtection) {
        return await window.advancedTrialProtection.recordTrialUsage();
      }

      console.warn('⚠️ 未找到可用的记录系统');
      return { success: true, reason: 'no-recording-system' };

    } catch (error) {
      console.error('❌ 记录旋律生成失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 显示试用状态
  displayTrialStatus(status) {
    const statusElement = document.getElementById('trial-status');
    if (!statusElement) return;

    let statusHTML = '';

    if (status.hasFullAccess) {
      statusHTML = `
        <div class="trial-active">
          <h3 style="color: #27ae60;">✅ 完整版已激活</h3>
          <p style="color: #27ae60;">享受无限制使用</p>
        </div>
      `;
      this.hidePurchaseInterface();
    } else if (status.allowed) {
      // 隐藏试用状态显示，不显示任何试用信息
      statusHTML = ``;
    } else {
      statusHTML = `
        <div class="trial-expired">
          <h3 style="color: #e74c3c;">⏰ 试用已结束</h3>
          <p style="color: #e74c3c;">${status.message || '您的试用次数已用完，请购买完整版继续使用。'}</p>
          <div class="upgrade-options" style="margin-top: 15px;">
            <button onclick="window.location.href='/sight-reading-tool/#action-section'"
                    style="background: #e74c3c; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: 600;">
              立即购买完整版
            </button>
          </div>
        </div>
      `;
    }

    // 只有在需要显示内容时才显示元素
    if (statusHTML.trim()) {
      statusElement.innerHTML = statusHTML;
      statusElement.style.display = 'block';
    } else {
      statusElement.style.display = 'none';
    }
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

  // 拦截旋律生成函数（已禁用 - melody-counter-system 处理）
  interceptMelodyGeneration() {
    // ⚠️ 此方法已禁用
    // melody-counter-system.js 已经实现了更优化的乐观更新机制
    // 避免重复包装导致冲突和性能问题

    console.log('ℹ️ 函数拦截已禁用 - 由 melody-counter-system 统一处理');
    console.log('✅ 集成管理器专注于状态检查和显示');

    // 检查 melodyCounterSystem 是否已就绪
    if (window.melodyCounterSystem && window.melodyCounterSystem.initialized) {
      console.log('✅ melody-counter-system 已接管函数包装（支持乐观更新）');
      return true;
    } else {
      console.warn('⚠️ melody-counter-system 未就绪');
      return false;
    }
  }

  // 初始化集成管理器
  async init() {
    if (this.initialized) {
      console.log('🔄 集成试用管理器已初始化');
      return this.status;
    }

    console.log('🚀 启动集成试用管理器');

    // 等待其他系统加载
    await this.waitForSystems();

    // 检查初始状态
    this.status = await this.checkTrialStatus();

    // 显示状态
    this.displayTrialStatus(this.status);

    // 拦截旋律生成函数
    setTimeout(() => {
      this.interceptMelodyGeneration();
    }, 1000); // 延迟1秒确保所有函数都已加载

    this.initialized = true;
    console.log('✅ 集成试用管理器初始化完成');

    return this.status;
  }
}

// 全局实例
window.integratedTrialManager = new IntegratedTrialManager();

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
  if (window.location.pathname.includes('sight-reading') ||
      document.querySelector('.sight-reading-tool')) {

    console.log('🔄 启动集成试用管理器...');

    // 延迟初始化，确保其他脚本已加载
    setTimeout(() => {
      window.integratedTrialManager.init();
    }, 2000);
  }
});

// 导出功能供外部使用
window.checkIntegratedTrialAccess = () => window.integratedTrialManager.checkTrialStatus();
window.recordIntegratedTrialUsage = () => window.integratedTrialManager.recordMelodyGeneration();
