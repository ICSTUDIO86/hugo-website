/**
 * IC Studio 视奏工具 - 付费用户界面管理器
 * 确保付费用户获得干净的界面体验，未付费用户受到正确限制
 */

class PremiumUIManager {
  constructor() {
    this.version = '1.0.0-20250107';
    console.log('🎨 付费用户界面管理器初始化', 'v' + this.version);
    
    this.init();
  }

  // 初始化管理器
  init() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupUI());
    } else {
      this.setupUI();
    }
  }

  // 检查用户是否有有效的访问码（增强验证）
  hasValidAccessCode() {
    try {
      const accessData = localStorage.getItem('ic-premium-access');
      if (!accessData) return false;

      const data = JSON.parse(accessData);
      if (!data || !data.code || data.code.length !== 12) return false;

      // 检查是否过期（永久访问码不会过期）
      if (data.expiresAt && data.expiresAt !== null && Date.now() > data.expiresAt) {
        return false;
      }

      // 【修复】优先信任服务器验证，只在明确检测到测试前缀时才拒绝
      if (!data.serverVerified) {
        const hasObviousTestPrefix = ['TEST', 'DEMO', 'FORCE', 'BACKUP', 'EMERGENCY'].some(prefix => data.code.startsWith(prefix));
        if (hasObviousTestPrefix) {
          console.warn('⚠️ 检测到测试访问码前缀:', data.code);
          localStorage.removeItem('ic-premium-access');
          return false;
        }
        // 其他情况下信任访问码，特别是Stripe等正常支付生成的访问码
        console.log('ℹ️ 访问码未经前端验证但格式正常，允许使用:', data.code);
      }

      console.log('✅ 检测到有效访问码:', data.code);
      return true;
    } catch (error) {
      console.error('访问码检查失败:', error);
      return false;
    }
  }

  // 验证访问码模式是否为真实购买生成的
  isValidCodePattern(code) {
    // 【修复】放宽验证逻辑，只排除明显的测试前缀，保留Stripe等合法前缀
    const testPrefixes = ['TEST', 'DEMO', 'FORCE', 'BACKUP', 'EMERGENCY'];
    
    const hasTestPrefix = testPrefixes.some(prefix => code.startsWith(prefix));
    if (hasTestPrefix) {
      console.warn('⚠️ 检测到测试访问码前缀:', code);
      return false;
    }

    // 如果是11-12位的字母数字组合，认为是有效的
    if (/^[A-Z0-9]{11,12}$/.test(code)) {
      return true;
    }

    return false;
  }

  // 设置UI界面
  setupUI() {
    // 首先清理测试访问码
    this.cleanupTestAccessCodes();
    
    const hasAccess = this.hasValidAccessCode();
    console.log('🎨 设置UI界面，用户状态:', hasAccess ? '付费用户' : '免费用户');

    if (hasAccess) {
      this.setupPremiumUI();
    } else {
      this.setupTrialUI();
    }
  }

  // 为付费用户设置干净的界面
  setupPremiumUI() {
    console.log('🌟 设置付费用户干净界面');

    // 1. 隐藏支付区域
    const zpayContainer = document.getElementById('zpay-container');
    if (zpayContainer) {
      zpayContainer.style.display = 'none';
      console.log('✅ 隐藏支付区域');
    }

    // 2. 隐藏访问码输入区域
    const accessCodeContainer = document.getElementById('access-code-container');
    if (accessCodeContainer) {
      accessCodeContainer.style.display = 'none';
      console.log('✅ 隐藏访问码输入区域');
    }

    // 3. 隐藏试用状态信息
    const trialStatus = document.getElementById('trial-status');
    if (trialStatus) {
      trialStatus.style.display = 'none';
      console.log('✅ 隐藏试用状态信息');
    }

    // 4. 【增强】移除所有试用相关的警告消息和元素
    this.removeTrialMessages();
    this.removeAllTrialElements();

    // 5. 确保功能按钮正常显示
    this.enableAllFeatures();

    // 6. 显示付费用户欢迎信息（可选）
    this.showPremiumWelcome();

    // 7. 【新增】完全停用试用限制器
    this.disableTrialLimiter();

    console.log('✨ 付费用户干净界面设置完成');
  }

  // 为免费用户设置试用界面
  setupTrialUI() {
    console.log('⏰ 设置免费用户试用界面');

    // 不强制执行试用限制，让 trialLimiter 自己管理试用状态
    // this.enforceTrialLimits();
    
    // 显示支付区域和访问码输入（如果还在试用期内）
    this.showPaymentOptions();
  }

  // 移除所有试用相关消息
  removeTrialMessages() {
    const messagesToRemove = [
      '免费试用时间已用完',
      '永远激活成功',
      '已购买请输入访问码',
      'trial',
      'expired',
      'activate'
    ];

    // 查找并隐藏包含这些关键词的元素
    document.querySelectorAll('*').forEach(element => {
      if (element.innerText) {
        const text = element.innerText.toLowerCase();
        if (messagesToRemove.some(msg => text.includes(msg.toLowerCase()))) {
          // 不是核心功能按钮才隐藏
          if (!element.closest('.controls') && !element.closest('.header')) {
            element.style.display = 'none';
            console.log('✅ 隐藏试用相关消息:', element.innerText.substring(0, 50));
          }
        }
      }
    });
  }

  // 启用所有功能
  enableAllFeatures() {
    // 确保生成按钮可用
    const generateBtn = document.getElementById('generate-btn') || 
                       document.querySelector('[onclick*="generateMelody"]') ||
                       document.querySelector('button[onclick*="generate"]');
    
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.style.opacity = '1';
      generateBtn.style.pointerEvents = 'auto';
      console.log('✅ 生成按钮已启用');
    }

    // 移除任何功能限制
    if (window.trialLimiter) {
      // 重写试用限制器的检查方法
      window.trialLimiter.checkAccess = function() {
        return { allowed: true, remaining: Infinity };
      };
      console.log('✅ 试用限制已移除');
    }
  }

  // 显示付费用户欢迎信息（可选）
  showPremiumWelcome() {
    const header = document.querySelector('.header');
    if (header && !header.querySelector('.premium-status')) {
      const welcomeElement = document.createElement('div');
      welcomeElement.className = 'premium-status';
      welcomeElement.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        display: inline-block;
        margin-bottom: 10px;
      `;
      welcomeElement.innerHTML = '✨ 高级版已激活';
      
      header.insertBefore(welcomeElement, header.firstChild);
      console.log('✅ 显示付费用户状态');
    }
  }

  // 强制执行试用限制
  enforceTrialLimits() {
    if (!window.trialLimiter) return;

    const trialStatus = window.trialLimiter.checkTrialStatus();
    if (!trialStatus.allowed) {
      console.log('⏰ 试用时间已结束，显示升级选项');
      
      // 禁用生成功能
      const generateBtn = document.getElementById('generate-btn') || 
                         document.querySelector('[onclick*="generateMelody"]');
      if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.style.opacity = '0.5';
      }

      // 显示试用结束消息
      this.showTrialExpiredMessage();
    }
  }

  // 显示试用结束消息
  showTrialExpiredMessage() {
    const trialStatus = document.getElementById('trial-status');
    if (trialStatus) {
      trialStatus.innerHTML = `
        <div style="background: #fff5f5; padding: 15px; border-radius: 8px; border: 2px solid #e74c3c; text-align: center;">
          <h3 style="color: #e74c3c; margin: 0 0 10px 0;">⏰ 免费试用时间已结束</h3>
          <p style="margin: 0; color: #666;">每台设备可免费试用 10 分钟</p>
        </div>
      `;
      trialStatus.style.display = 'block';
    }
  }

  // 显示支付选项
  showPaymentOptions() {
    const zpayContainer = document.getElementById('zpay-container');
    if (zpayContainer) {
      zpayContainer.style.display = 'block';
      console.log('✅ 显示支付选项');
    }

    const accessCodeContainer = document.getElementById('access-code-container');
    if (accessCodeContainer) {
      accessCodeContainer.style.display = 'block';
      console.log('✅ 显示访问码输入');
    }
  }

  // 重新检查并更新UI（用于访问码验证后）
  refreshUI() {
    console.log('🔄 刷新UI状态');
    // 先清理测试访问码再更新UI
    this.cleanupTestAccessCodes();
    this.setupUI();
  }

  // 清理所有测试和应急访问码
  cleanupTestAccessCodes() {
    try {
      const accessData = localStorage.getItem('ic-premium-access');
      if (accessData) {
        const data = JSON.parse(accessData);
        if (data && data.code && !this.isValidCodePattern(data.code)) {
          console.log('🧹 清理测试访问码:', data.code);
          localStorage.removeItem('ic-premium-access');
        }
      }
    } catch (error) {
      console.error('清理访问码时出错:', error);
    }
  }

  // 【新增】移除所有试用相关的DOM元素
  removeAllTrialElements() {
    console.log('🧹 移除所有试用相关元素');
    
    // 移除试用覆盖层
    const overlays = document.querySelectorAll('.trial-overlay, .access-overlay, .premium-overlay');
    overlays.forEach(overlay => {
      overlay.remove();
      console.log('✅ 移除覆盖层:', overlay.className);
    });
    
    // 隐藏包含试用信息的元素
    const trialElements = document.querySelectorAll('[id*="trial"], [class*="trial"]');
    trialElements.forEach(element => {
      if (!element.closest('.controls') && !element.closest('.header')) {
        element.style.display = 'none';
        console.log('✅ 隐藏试用元素:', element.id || element.className);
      }
    });
    
    // 移除试用时间显示
    const timeDisplays = document.querySelectorAll('.trial-active, .trial-expired, .trial-welcome');
    timeDisplays.forEach(display => {
      display.remove();
      console.log('✅ 移除试用时间显示');
    });
  }

  // 【新增】完全停用试用限制器
  disableTrialLimiter() {
    console.log('🔓 完全停用试用限制器');
    
    if (window.trialLimiter) {
      // 重写试用限制器的检查方法
      window.trialLimiter.checkTrialStatus = function() {
        return { 
          allowed: true, 
          remaining: Infinity,
          unlimited: true,
          premium: true
        };
      };
      
      window.trialLimiter.init = function() {
        console.log('🔓 试用限制器已被付费版本禁用');
        return true;
      };
      
      window.trialLimiter.blockAccess = function() {
        console.log('🔓 访问阻止被付费版本忽略');
        return;
      };
      
      console.log('✅ 试用限制器已完全停用');
    }
  }

  // 修复访问控制逻辑（移除强制解锁）
  fixAccessControl() {
    console.log('🔧 修复访问控制逻辑');

    // 恢复正确的访问检查函数
    if (window.checkFullAccess) {
      window.checkFullAccess = () => {
        return this.hasValidAccessCode();
      };
      console.log('✅ 访问控制已修复');
    }

    // 不再包装generateMelody函数，让melody-counter-system处理
    console.log('ℹ️ generateMelody函数由melody-counter-system管理');
  }
}

// 全局实例化
window.premiumUIManager = new PremiumUIManager();

// 页面加载完成后修复访问控制
document.addEventListener('DOMContentLoaded', function() {
  if (window.premiumUIManager) {
    window.premiumUIManager.fixAccessControl();
  }
});

// 为其他脚本提供刷新UI的方法
window.refreshPremiumUI = function() {
  if (window.premiumUIManager) {
    window.premiumUIManager.refreshUI();
  }
};

// 提供调试用的清理函数
window.cleanupAllTestCodes = function() {
  console.log('🧹 手动清理所有测试访问码');
  localStorage.removeItem('ic-premium-access');
  localStorage.removeItem('ic-verified-user');
  localStorage.removeItem('ic-full-access');
  
  if (window.premiumUIManager) {
    window.premiumUIManager.refreshUI();
  }
  console.log('✅ 已清理所有测试访问码，UI已刷新');
};