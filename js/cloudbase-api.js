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
        return { 
          valid: false, 
          error: result.message || '访问码无效或已过期' 
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

  // 检查用户是否有完整版权限
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

    // 在线验证访问码
    const verification = await this.verifyAccessCode(localAccess.code);
    
    if (verification.valid) {
      return { hasAccess: true, accessData: localAccess };
    } else {
      // 访问码无效，清除本地数据
      localStorage.removeItem('ic-premium-access');
      return { 
        hasAccess: false, 
        reason: 'invalid-code', 
        error: verification.error 
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