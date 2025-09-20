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

  // 等待其他系统加载完成
  async waitForSystems() {
    let attempts = 0;
    const maxAttempts = 50; // 5秒

    while (attempts < maxAttempts) {
      if (window.advancedTrialProtection && window.melodyCounter) {
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
      if (window.melodyCounter) {
        const counterStatus = await window.melodyCounter.checkStatus();
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
      const melodyStatus = window.melodyCounter ? await window.melodyCounter.checkStatus() : { remaining: 20, total: 20 };

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
      if (window.melodyCounter && window.melodyCounter.recordGeneration) {
        const result = await window.melodyCounter.recordGeneration();

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
      const remaining = status.remainingMelodies || 0;
      const total = status.totalMelodies || 20;
      const usedPercent = ((total - remaining) / total * 100).toFixed(0);

      statusHTML = `
        <div class="trial-active">
          <h3 style="color: #3498db;">🆓 免费试用模式</h3>
          <div style="margin: 15px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span>剩余旋律:</span>
              <span><strong>${remaining}</strong> / ${total}</span>
            </div>
            <div style="background: #f0f0f0; border-radius: 10px; height: 8px; overflow: hidden;">
              <div style="background: linear-gradient(90deg, #3498db, #2980b9); height: 100%; width: ${usedPercent}%; transition: width 0.3s ease;"></div>
            </div>
          </div>
          ${status.isIncognito ? '<div class="warning" style="color: #e67e22; margin-top: 10px; font-size: 12px;">⚠️ 无痕浏览模式下使用</div>' : ''}
          <div class="upgrade-options" style="margin-top: 15px;">
            <p style="font-size: 12px; color: #666;">试用结束后需要购买完整版</p>
          </div>
        </div>
      `;
    } else {
      statusHTML = `
        <div class="trial-expired">
          <h3 style="color: #e74c3c;">⏰ 试用已结束</h3>
          <p style="color: #e74c3c;">${status.message || '您的试用次数已用完，请购买完整版继续使用。'}</p>
          <div class="upgrade-options" style="margin-top: 15px;">
            <button onclick="document.querySelector('#zpay-btn').scrollIntoView()"
                    style="background: #e74c3c; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: 600;">
              立即购买完整版
            </button>
          </div>
        </div>
      `;
    }

    statusElement.innerHTML = statusHTML;
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

  // 拦截旋律生成函数
  interceptMelodyGeneration() {
    // 寻找原始的生成函数
    const possibleFunctions = [
      'generateMelody',
      'window.generateMelody',
      'generateMusic',
      'createMelody'
    ];

    for (const funcName of possibleFunctions) {
      let func = null;

      try {
        if (funcName.startsWith('window.')) {
          func = window[funcName.substring(7)];
        } else {
          func = window[funcName];
        }
      } catch (e) {
        continue;
      }

      if (typeof func === 'function') {
        console.log(`🎯 找到旋律生成函数: ${funcName}`);

        const originalFunc = func;
        const self = this;

        // 创建拦截函数
        const interceptedFunc = async function(...args) {
          console.log('🎵 旋律生成请求拦截');

          // 检查试用状态
          const status = await self.checkTrialStatus();

          if (!status.allowed && !status.hasFullAccess) {
            console.log('🚫 试用限制，阻止生成');
            self.displayTrialStatus(status);

            // 显示限制消息
            alert(status.message || '试用已结束，请购买完整版继续使用');
            return false;
          }

          // 记录使用
          if (!status.hasFullAccess) {
            const recordResult = await self.recordMelodyGeneration();
            if (!recordResult.success) {
              console.log('🚫 记录失败，阻止生成');
              alert(recordResult.message || '无法记录使用，请稍后重试');
              return false;
            }
          }

          // 调用原始函数
          console.log('✅ 允许生成旋律');
          return originalFunc.apply(this, args);
        };

        // 替换函数
        if (funcName.startsWith('window.')) {
          window[funcName.substring(7)] = interceptedFunc;
        } else {
          window[funcName] = interceptedFunc;
        }

        console.log(`✅ 已拦截函数: ${funcName}`);
        return true;
      }
    }

    console.warn('⚠️ 未找到旋律生成函数进行拦截');
    return false;
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