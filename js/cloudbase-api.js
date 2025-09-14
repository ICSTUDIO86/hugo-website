/**
 * IC 视奏工具 - Cloudbase API 客户端 (混合架构版本)
 * 专为 GitHub Pages + Cloudbase 后端架构设计
 */

class CloudbaseAPI {
  constructor() {
    // Cloudbase API 配置
    this.config = {
      envId: 'cloud1-4g1r5ho01a0cfd85',
      region: 'ap-shanghai',
      // 直接调用云函数HTTP API，不使用SDK
      apiBaseUrl: 'https://cloud1-4g1r5ho01a0cfd85.service.tcloudbase.com'
    };
    
    // 生产模式控制
    this.isTestMode = false; // 生产模式
    this.forceTestMode = false; // 生产模式，允许调用真实API
    this.version = '2.0.1-20250107'; // 版本标识，与支付系统同步
    
    console.log('🔗 CloudbaseAPI 初始化 - 混合架构模式', this.isTestMode ? '(强制测试模式)' : '(生产模式)', 'v' + this.version);
    
    // 设置全局版本标识
    window.cloudbaseApiVersion = this.version;
  }

  // HTTP请求封装 - 生产模式（直连CloudBase）
  async httpRequest(endpoint, data = {}, method = 'POST') {
    const url = `${this.config.apiBaseUrl}${endpoint}`;
    
    console.log('🚀 生产模式 - CloudBase API请求:', { url, method, data });
    
    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Source': 'IC-Studio-Production',
          'X-API-Version': this.version
        },
        mode: 'cors',
        body: method === 'GET' ? undefined : JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`CloudBase API错误 ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ CloudBase API响应:', result);
      return result;
      
    } catch (error) {
      console.error(`🚨 CloudBase API请求失败 [${endpoint}]:`, error);
      
      // 生产环境降级处理 - 确保用户体验不受影响
      console.log('🚨 CloudBase API 请求失败，但不使用应急处理');
      console.log('🔍 错误详情:', error.message);
      console.log('🔍 请求URL:', `${this.config.apiBaseUrl}${endpoint}`);
      
      // 不再使用应急处理，让真实错误传播上去
      // 这样前端可以看到真正的网络错误，而不是被应急处理掩盖
      
      // 其他情况抛出错误
      throw error;
    }
  }
  
  // 切换到生产模式（管理员功能）
  enableProductionMode() {
    this.isTestMode = false;
    this.forceTestMode = false;
    console.log('🚀 已切换到生产模式 - 将调用真实API');
    localStorage.setItem('ic-api-mode', 'production');
  }
  
  // 切换到测试模式
  enableTestMode() {
    this.isTestMode = true;
    this.forceTestMode = true;
    console.log('🧪 已切换到测试模式 - 将使用模拟API');
    localStorage.setItem('ic-api-mode', 'test');
  }
  
  // 获取当前模式
  getCurrentMode() {
    return this.isTestMode ? 'test' : 'production';
  }

  // 验证访问码 - CloudBase 数据库验证
  async verifyAccessCode(code) {
    console.log('🔍 CloudBase访问码验证:', code);
    
    // 基本格式检查（11-12位字母数字组合）
    if (!code || (code.length !== 12 && code.length !== 11)) {
      console.log('❌ 访问码格式无效:', code);
      return { valid: false, error: '访问码格式无效，请输入11-12位访问码' };
    }
    
    // 检查是否只包含字母数字
    if (!/^[A-Z0-9]+$/.test(code.toUpperCase())) {
      console.log('❌ 访问码格式错误：只能包含字母数字', code);
      return { valid: false, error: '访问码格式无效，只能包含字母和数字' };
    }
    
    try {
      // 调用CloudBase云函数验证访问码
      const result = await this.httpRequest('/verify-access-code', {
        code: code.toUpperCase(),
        deviceId: window.trialLimiter?.deviceId || 'unknown',
        timestamp: Date.now()
      });
      
      console.log('📥 CloudBase验证结果:', result);
      
      if (result.success) {
        console.log('✅ CloudBase验证成功:', result.data.code);
        
        // 保存并激活访问权限
        this.saveValidAccessCode(result.data.code, result.data);
        this.ensurePersistentAccess(result.data.code);
        this.removeTrialRestrictions();
        
        return { 
          valid: true, 
          data: result.data
        };
      } else {
        console.log('❌ CloudBase验证失败:', result.message);
        
        // 🔄 增强：检查是否为退款导致的验证失败
        const isRefunded = result.message && result.message.includes('已退款');
        
        return { 
          valid: false, 
          error: result.message || '访问码无效或已过期',
          refunded: isRefunded,
          refundInfo: result.refundInfo || null
        };
      }
      
    } catch (error) {
      console.error('❌ CloudBase验证错误:', error);
      return { 
        valid: false, 
        error: '验证失败，请稍后重试' 
      };
    }
  }

  // 🔄 新增：处理退款访问码的权限清除
  handleRefundedAccess(verificationResult) {
    // 清除所有本地权限相关的存储
    localStorage.removeItem('ic-premium-access');
    localStorage.removeItem('ic-verified-user');
    localStorage.removeItem('ic-full-access');
    sessionStorage.removeItem('ic-session-verified');
    
    // 清除所有试用限制相关的数据（重新启用试用）
    localStorage.removeItem('ic-sight-reading-trial');
    localStorage.removeItem('trial-start-time');
    localStorage.removeItem('trial-used-time');
    
    // 清除cookies
    document.cookie = 'ic_premium_access=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    console.log('🗑️ 退款访问码相关权限已全部清除');
    
    // 显示退款通知（可选）
    if (verificationResult.refundInfo) {
      this.showRefundNotification(verificationResult.refundInfo);
    }
  }

  // 🔄 新增：显示退款通知
  showRefundNotification(refundInfo) {
    // 创建退款通知界面
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; 
      background: #fff3cd; border: 1px solid #ffeaa7;
      border-radius: 8px; padding: 15px 20px; 
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000; max-width: 350px;
      color: #856404; font-size: 14px;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 18px; margin-right: 8px;">⚠️</span>
        <strong>访问码已退款</strong>
      </div>
      <p style="margin: 0 0 8px 0;">您的访问码权限已失效。</p>
      <p style="margin: 0; font-size: 12px; color: #6c757d;">
        退款时间: ${refundInfo.refundTime ? new Date(refundInfo.refundTime).toLocaleString() : '未知'}
      </p>
      <button onclick="this.parentElement.remove()" style="
        position: absolute; top: 5px; right: 8px; 
        background: none; border: none; font-size: 16px; 
        cursor: pointer; color: #856404;
      ">×</button>
    `;
    
    document.body.appendChild(notification);
    
    // 5秒后自动消失
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  // 🔄 新增：关键功能权限检查包装器
  async checkPermissionBeforeAction(actionName = '高级功能') {
    console.log(`🔒 检查 ${actionName} 的使用权限...`);
    
    const accessCheck = await this.hasFullAccess();
    
    if (accessCheck.hasAccess) {
      console.log(`✅ ${actionName} 权限验证通过`);
      return { 
        allowed: true, 
        accessData: accessCheck.accessData 
      };
    } else {
      console.log(`❌ ${actionName} 权限验证失败:`, accessCheck.reason);
      
      // 根据不同的失败原因显示不同的提示
      let message = '';
      let showPayment = true;
      
      switch (accessCheck.reason) {
        case 'refunded':
          message = '您的访问码已退款，权限已失效。如需继续使用，请重新购买。';
          break;
        case 'expired':
          message = '您的访问码已过期，请重新购买激活。';
          break;
        case 'invalid-code':
          message = '访问码无效或已被禁用，请重新购买或联系客服。';
          break;
        case 'no-code':
          message = '请先购买并输入访问码以使用完整功能。';
          break;
        case 'verification-error':
          message = '网络连接失败，请检查网络后重试。';
          showPayment = false;
          break;
        default:
          message = '权限验证失败，请重新购买或联系客服。';
      }
      
      this.showPermissionDeniedDialog(actionName, message, showPayment);
      
      return { 
        allowed: false, 
        reason: accessCheck.reason,
        error: accessCheck.error
      };
    }
  }

  // 🔄 新增：显示权限拒绝对话框
  showPermissionDeniedDialog(actionName, message, showPayment = true) {
    // 移除现有的对话框
    const existing = document.getElementById('permission-denied-dialog');
    if (existing) existing.remove();
    
    const dialog = document.createElement('div');
    dialog.id = 'permission-denied-dialog';
    dialog.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center;
      z-index: 99999; backdrop-filter: blur(5px);
    `;
    
    const paymentButtons = showPayment ? `
      <div style="margin-top: 20px; display: flex; gap: 12px; justify-content: center;">
        <button onclick="document.getElementById('permission-denied-dialog').remove(); window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'});" style="
          padding: 12px 24px; background: #667eea; color: white; border: none;
          border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer;
        ">立即购买</button>
        <button onclick="document.getElementById('permission-denied-dialog').remove();" style="
          padding: 12px 24px; background: #f8f9fa; color: #495057; border: 2px solid #dee2e6;
          border-radius: 8px; font-size: 16px; cursor: pointer;
        ">稍后再说</button>
      </div>
    ` : `
      <div style="margin-top: 20px;">
        <button onclick="document.getElementById('permission-denied-dialog').remove(); window.location.reload();" style="
          padding: 12px 24px; background: #28a745; color: white; border: none;
          border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer;
        ">重新加载</button>
      </div>
    `;
    
    dialog.innerHTML = `
      <div style="
        background: white; border-radius: 16px; padding: 30px; max-width: 450px; width: 90%;
        box-shadow: 0 25px 80px rgba(0,0,0,0.3); text-align: center;
      ">
        <div style="
          width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #ffc107, #e0a800);
          margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center;
        ">
          <span style="color: white; font-size: 24px;">🔒</span>
        </div>
        
        <h3 style="color: #495057; font-size: 20px; font-weight: 700; margin: 0 0 15px 0;">
          ${actionName} 需要完整版权限
        </h3>
        
        <p style="color: #6c757d; font-size: 14px; line-height: 1.5; margin: 0 0 20px 0;">
          ${message}
        </p>
        
        ${paymentButtons}
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // 点击背景关闭
    dialog.onclick = (e) => {
      if (e.target === dialog) {
        dialog.remove();
      }
    };
  }

  // 生成访问码（支付成功后调用）- 生产模式CloudBase API
  async generateAccessCode(paymentData) {
    try {
      console.log('🚀 CloudBase生成访问码请求:', paymentData);
      
      // 调用CloudBase云函数生成访问码
      const result = await this.httpRequest('/generate-access-code', {
        orderId: paymentData.orderId,
        paymentMethod: paymentData.paymentMethod,
        amount: paymentData.amount,
        merchantId: paymentData.merchantId,
        transactionId: paymentData.transactionId,
        deviceId: window.trialLimiter?.deviceId || 'unknown',
        timestamp: Date.now(),
        source: 'ic-studio-production'
      });
      
      console.log('📥 CloudBase API返回结果:', result);

      // 处理新的简化响应格式
      if (result.success && result.accessCode) {
        console.log('✅ CloudBase访问码生成成功:', result.accessCode);
        return { 
          success: true, 
          accessCode: result.accessCode 
        };
      } else if (result.code === 200 && result.data && result.data.accessCode) {
        // 兼容旧格式
        console.log('✅ CloudBase访问码生成成功 (旧格式):', result.data.accessCode);
        return { 
          success: true, 
          accessCode: result.data.accessCode 
        };
      } else {
        console.error('❌ CloudBase访问码生成失败:', result);
        return { 
          success: false, 
          error: result.message || 'CloudBase生成访问码失败' 
        };
      }
    } catch (error) {
      console.error('🚨 CloudBase生成访问码异常:', error);
      // httpRequest方法中已经包含了降级处理
      throw error;
    }
  }

  // 处理支付回调（内部使用）
  async handlePaymentCallback(callbackData) {
    try {
      const result = await this.httpRequest('/zpay-callback', callbackData);
      return result;
    } catch (error) {
      console.error('支付回调处理失败:', error);
      throw error;
    }
  }

  // 保存有效的访问码到本地
  saveValidAccessCode(code, data = {}) {
    const accessData = {
      code: code,
      activatedAt: Date.now(),
      deviceId: window.trialLimiter?.deviceId || 'unknown',
      expiresAt: data.expires_at || null, // 永不过期
      version: '2.0-hybrid'
    };
    
    localStorage.setItem('ic-premium-access', JSON.stringify(accessData));
    console.log('✅ 访问码已保存到本地（永久有效）');
  }

  // 检查本地是否有有效访问码
  getLocalAccessCode() {
    try {
      const data = localStorage.getItem('ic-premium-access');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('读取本地访问码失败:', error);
      return null;
    }
  }

  // 检查用户是否有完整版权限 - 增强版（支持退款检测）
  async hasFullAccess() {
    const localAccess = this.getLocalAccessCode();
    
    if (!localAccess) {
      return { hasAccess: false, reason: 'no-code' };
    }

    // 检查是否过期（永久访问码不会过期）
    if (localAccess.expiresAt && localAccess.expiresAt !== null && Date.now() > localAccess.expiresAt) {
      localStorage.removeItem('ic-premium-access');
      return { hasAccess: false, reason: 'expired' };
    }

    // 🔄 增强：在线验证访问码（包含退款状态检查）
    try {
      const verification = await this.verifyAccessCode(localAccess.code);
      
      if (verification.valid) {
        return { hasAccess: true, accessData: localAccess };
      } else {
        // 检查是否为退款导致的无效
        if (verification.refunded) {
          console.log('⚠️ 访问码已退款，清除本地权限');
          this.handleRefundedAccess(verification);
          return { 
            hasAccess: false, 
            reason: 'refunded', 
            error: verification.error,
            refundInfo: verification.refundInfo
          };
        }
        
        // 其他原因导致的无效，清除本地数据
        localStorage.removeItem('ic-premium-access');
        return { 
          hasAccess: false, 
          reason: 'invalid-code', 
          error: verification.error 
        };
      }
    } catch (error) {
      console.error('❌ 权限验证失败:', error);
      return {
        hasAccess: false,
        reason: 'verification-error',
        error: '网络错误，请稍后重试'
      };
    }
  }

  // 初始化访问码输入界面
  initAccessCodeInput() {
    const container = document.getElementById('access-code-container');
    if (!container) return;

    // 不再创建重复的访问码界面，使用HTML中已有的zpay-container中的输入框

    // 监听输入框变化，自动格式化
    const input = document.getElementById('access-code');
    input?.addEventListener('input', function(e) {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });

    // 监听回车键
    input?.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        cloudbaseAPI.handleAccessCodeSubmit();
      }
    });
  }

  // 处理访问码提交 - CloudBase 数据库验证
  async handleAccessCodeSubmit() {
    const input = document.getElementById('access-code');
    const resultDiv = document.getElementById('access-code-result');
    const button = document.getElementById('verify-code-btn');
    
    if (!input || !resultDiv) {
      console.log('🔍 CloudBase: 输入元素未找到，尝试兼容处理');
      // 兼容性处理：尝试查找其他可能的输入框
      const altInput = document.getElementById('access-code-input');
      const altResultDiv = document.getElementById('verify-result');
      
      if (altInput && altResultDiv) {
        this.handleAlternativeAccessCodeSubmit(altInput, altResultDiv);
      }
      return;
    }

    const code = input.value.trim().toUpperCase();
    console.log('🔍 CloudBase处理访问码提交:', code);
    
    if (!code || (code.length !== 12 && code.length !== 11)) {
      resultDiv.innerHTML = '<p style="color: #e74c3c;">⚠️ 请输入有效的11-12位访问码</p>';
      return;
    }

    // 显示验证中状态
    if (button) {
      button.textContent = '验证中...';
      button.disabled = true;
    }
    resultDiv.innerHTML = '<p style="color: #3498db;">🔄 正在验证访问码...</p>';

    try {
      // 调用 CloudBase 数据库验证
      console.log('🚀 调用 CloudBase 数据库验证访问码:', code);
      const result = await this.verifyAccessCode(code);
      
      if (result.valid) {
        console.log('✅ CloudBase 验证成功:', code);
        resultDiv.innerHTML = '<p style="color: #27ae60;">✅ 验证成功！页面即将刷新...</p>';
        
        setTimeout(() => {
          console.log('🔄 CloudBase触发页面刷新');
          window.location.reload();
        }, 1500);
        
      } else {
        console.log('❌ CloudBase 验证失败:', result.error);
        resultDiv.innerHTML = `<p style="color: #e74c3c;">❌ ${result.error}</p>`;
        
        if (button) {
          button.textContent = '验证';
          button.disabled = false;
        }
      }
      
    } catch (error) {
      console.error('❌ 访问码验证异常:', error);
      resultDiv.innerHTML = '<p style="color: #e74c3c;">❌ 验证失败，请稍后重试</p>';
      
      if (button) {
        button.textContent = '验证';
        button.disabled = false;
      }
    }
  }

  // 处理备用访问码输入（兼容页面中的其他输入框）
  async handleAlternativeAccessCodeSubmit(input, resultDiv) {
    const code = input.value.trim().toUpperCase();
    console.log('🔍 CloudBase备用处理访问码:', code);
    
    if (!code || (code.length !== 12 && code.length !== 11)) {
      resultDiv.innerHTML = '<p style="color: #e74c3c;">⚠️ 请输入有效的11-12位访问码</p>';
      return;
    }

    resultDiv.innerHTML = '<p style="color: #3498db;">🔄 正在验证访问码...</p>';
    
    try {
      // 调用 CloudBase 数据库验证
      console.log('🚀 备用方式调用 CloudBase 数据库验证:', code);
      const result = await this.verifyAccessCode(code);
      
      if (result.valid) {
        console.log('✅ 备用验证成功:', code);
        resultDiv.innerHTML = '<p style="color: #27ae60;">✅ 验证成功！页面即将刷新...</p>';
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);
        
      } else {
        console.log('❌ 备用验证失败:', result.error);
        resultDiv.innerHTML = `<p style="color: #e74c3c;">❌ ${result.error}</p>`;
      }
      
    } catch (error) {
      console.error('❌ 备用访问码验证异常:', error);
      resultDiv.innerHTML = '<p style="color: #e74c3c;">❌ 验证失败，请稍后重试</p>';
    }
  }

  // 确保访问权限持久化
  ensurePersistentAccess(code) {
    // 多重存储机制
    localStorage.setItem('ic-verified-user', 'true');
    localStorage.setItem('ic-access-timestamp', Date.now().toString());
    sessionStorage.setItem('ic-session-verified', 'true');
    
    // 设置长期cookie
    document.cookie = `ic_premium_access=${code}; path=/; max-age=${365*24*60*60}; SameSite=Strict`;
    
    console.log('🔒 访问权限已多重持久化');
  }

  // 移除试用限制
  removeTrialRestrictions() {
    // 清除试用相关的localStorage
    localStorage.removeItem('ic-sight-reading-trial');
    localStorage.removeItem('trial-start-time');
    localStorage.removeItem('trial-used-time');
    
    // 设置完整版标记
    localStorage.setItem('ic-full-access', 'true');
    
    console.log('🗑️ 试用限制已移除');
  }

  // 测试访问码验证（调试用）
  async testVerification(code = 'DEMODZLVQITL') {
    console.log('🧪 开始测试访问码验证...');
    try {
      const result = await this.verifyAccessCode(code);
      console.log('🧪 测试结果:', result);
      return result;
    } catch (error) {
      console.error('🧪 测试失败:', error);
      return { valid: false, error: error.message };
    }
  }

  // 生成完全随机的11-12位访问码
  generateRandomAccessCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const length = Math.random() < 0.5 ? 11 : 12; // 随机选择11位或12位
    let code = '';
    
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return code;
  }

  // 获取当前环境信息
  getEnvironmentInfo() {
    return {
      architecture: 'hybrid',
      frontend: 'github-pages',
      backend: 'cloudbase',
      apiEndpoint: this.config.apiBaseUrl,
      version: '2.0'
    };
  }
}

// 全局实例 - 使用新的命名避免冲突
window.cloudbaseAPI = new CloudbaseAPI();

// 🔄 新增：全局权限检查便利函数
window.checkPremiumAccess = async function(featureName) {
  if (!window.cloudbaseAPI) {
    console.error('CloudbaseAPI 未初始化');
    return { allowed: false, reason: 'api-not-ready' };
  }
  
  return await window.cloudbaseAPI.checkPermissionBeforeAction(featureName);
};

// 🔄 新增：高级功能包装器
window.withPremiumCheck = function(func, featureName) {
  return async function(...args) {
    const permission = await window.checkPremiumAccess(featureName);
    if (permission.allowed) {
      return await func.apply(this, args);
    }
    // 权限检查失败，相关对话框已由checkPermissionBeforeAction显示
    return null;
  };
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 混合架构初始化:', cloudbaseAPI.getEnvironmentInfo());
  
  // 检查当前页面的完整版权限
  const accessResult = await cloudbaseAPI.hasFullAccess();
  console.log('🔐 权限检查结果:', accessResult);
  
  // 在试用页面根据权限状态决定显示内容
  if (window.location.pathname.includes('sight-reading-generator')) {
    if (accessResult.hasAccess) {
      console.log('✅ 检测到完整版权限，隐藏所有付费相关内容');
      
      // 隐藏试用状态区域
      const statusDiv = document.getElementById('trial-status');
      if (statusDiv) {
        statusDiv.style.display = 'none';
      }
      
      // 隐藏支付区域
      const zpayContainer = document.getElementById('zpay-container');
      if (zpayContainer) {
        zpayContainer.style.display = 'none';
      }
      
      // 隐藏访问码输入区域
      const accessCodeContainer = document.getElementById('access-code-container');
      if (accessCodeContainer) {
        accessCodeContainer.style.display = 'none';
      }
      
    } else {
      // 只有在没有权限时才显示访问码输入
      console.log('🔑 显示访问码输入区域');
      cloudbaseAPI.initAccessCodeInput();
    }
  }
  
  // 在支付页面也检查权限
  if (window.location.pathname.includes('sight-reading-tool')) {
    if (accessResult.hasAccess) {
      console.log('✅ 用户已有完整版权限');
      // 可以隐藏支付区域或显示已激活状态
    }
  }
  
  // 检查是否在完整版页面需要验证权限
  if (window.location.pathname.includes('premium-sight-reading')) {
    if (!accessResult.hasAccess && !window.location.search.includes('verified=true')) {
      alert('⚠️ 需要有效的访问码才能使用完整版功能');
      window.location.href = '/tools/sight-reading-generator.html';
    }
  }
});

// 导出API实例供其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CloudbaseAPI;
}