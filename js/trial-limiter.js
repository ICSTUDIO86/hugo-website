/**
 * IC 视奏工具 - 设备级别试用限制
 * 每台设备限制试用 10 分钟
 */

class TrialLimiter {
  constructor() {
    this.storageKey = 'ic-sight-reading-trial';
    this.trialDuration = 10 * 60 * 1000; // 10 分钟（毫秒）
    this.deviceId = this.generateDeviceId();
    this.warningShown = false;
  }

  // 生成设备唯一标识（增强版）
  generateDeviceId() {
    let deviceId = localStorage.getItem('ic-device-id');
    if (!deviceId) {
      // 增强的设备指纹
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

  // 生成增强的设备指纹
  generateDeviceFingerprint() {
    const fp = [];
    
    // 基础浏览器信息
    fp.push(navigator.userAgent);
    fp.push(navigator.language);
    fp.push(navigator.languages?.join(',') || 'unknown');
    fp.push(navigator.platform);
    fp.push(navigator.cookieEnabled);
    
    // 屏幕信息
    fp.push(screen.width + 'x' + screen.height);
    fp.push(screen.colorDepth);
    fp.push(screen.pixelDepth);
    fp.push(window.devicePixelRatio || 'unknown');
    
    // 时区和地理信息
    fp.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
    fp.push(new Date().getTimezoneOffset());
    
    // 硬件信息
    fp.push(navigator.hardwareConcurrency || 'unknown');
    fp.push(navigator.maxTouchPoints || 0);
    fp.push(navigator.deviceMemory || 'unknown');
    
    // WebGL 指纹
    const webglFingerprint = this.getWebGLFingerprint();
    fp.push(webglFingerprint);
    
    // Canvas 指纹
    const canvasFingerprint = this.getCanvasFingerprint();
    fp.push(canvasFingerprint);
    
    // 音频上下文指纹
    const audioFingerprint = this.getAudioFingerprint();
    fp.push(audioFingerprint);
    
    return fp.join('|');
  }

  // Canvas 指纹
  getCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // 绘制复杂图形
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('IC Studio 🎵', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Device Fingerprint', 4, 45);
      
      // 添加一些几何图形
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgb(255,0,255)';
      ctx.beginPath();
      ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();
      
      return canvas.toDataURL().slice(-50); // 只取最后50个字符
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

  // 音频上下文指纹
  getAudioFingerprint() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'triangle';
      oscillator.frequency.value = 10000;
      gainNode.gain.value = 0.05;
      
      oscillator.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(frequencyData);
      
      oscillator.stop();
      audioContext.close();
      
      return frequencyData.slice(0, 30).join(',');
    } catch (e) {
      return 'audio_error';
    }
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

  // 检查试用状态（增强防作弊版本）
  checkTrialStatus() {
    const trialData = this.getTrialData();
    const now = Date.now();

    // 检查是否在豁免期内
    const exemptTime = localStorage.getItem('ic-anticheat-exempt');
    const inExemptPeriod = exemptTime && (Date.now() - parseInt(exemptTime) < 5 * 60 * 1000);
    
    // 只有在非豁免期内才进行反作弊检测
    if (!inExemptPeriod && this.detectCheating(trialData)) {
      console.warn('🚨 检测到潜在的作弊行为');
      return { 
        allowed: false, 
        remaining: 0,
        expired: true,
        reason: 'security_violation'
      };
    }

    if (!trialData.startTime) {
      // 首次使用，记录开始时间
      this.startTrial();
      return { 
        allowed: true, 
        remaining: this.trialDuration,
        isFirstTime: true,
        inExemptPeriod 
      };
    }

    const elapsed = now - trialData.startTime;
    const remaining = Math.max(0, this.trialDuration - elapsed);

    // 验证时间合理性
    if (elapsed < 0) {
      console.warn('🚨 检测到时间异常');
      this.startTrial(); // 重新开始
      return { 
        allowed: true, 
        remaining: this.trialDuration,
        isFirstTime: true,
        inExemptPeriod 
      };
    }

    // 如果在豁免期内，即使试用时间到了也允许继续使用
    if (remaining <= 0 && !inExemptPeriod) {
      // 记录试用结束
      this.recordTrialEnd();
      return { 
        allowed: false, 
        remaining: 0,
        expired: true,
        inExemptPeriod 
      };
    }

    // 如果在豁免期内且试用时间到了，显示为剩余时间但允许继续使用
    if (remaining <= 0 && inExemptPeriod) {
      console.log('🛡️ 豁免期内，延长试用时间');
      return {
        allowed: true,
        remaining: 60000, // 显示还有1分钟，实际在豁免期内
        inExemptPeriod,
        exemptMode: true
      };
    }

    return { 
      allowed: true, 
      remaining,
      elapsed,
      inExemptPeriod 
    };
  }

  // 反作弊检测
  detectCheating(trialData) {
    try {
      // 检查豁免期（避免重置后误判）
      const exemptTime = localStorage.getItem('ic-anticheat-exempt');
      
      if (exemptTime) {
        const exemptStart = parseInt(exemptTime);
        const exemptDuration = 5 * 60 * 1000; // 5分钟豁免期
        const timeElapsed = Date.now() - exemptStart;
        
        if (timeElapsed < exemptDuration) {
          return false; // 豁免期内，跳过检测
        } else {
          // 豁免期结束，清理标记
          localStorage.removeItem('ic-anticheat-exempt');
        }
      }
      // 检测1：验证设备ID一致性
      const currentDeviceId = this.generateDeviceId();
      if (trialData.deviceId && trialData.deviceId !== currentDeviceId) {
        console.log('⚠️ 设备ID不匹配:', { stored: trialData.deviceId, current: currentDeviceId });
        return true;
      }

      // 检测2：检查多重存储一致性
      const sessionId = sessionStorage.getItem('ic-device-id-session');
      const cookieId = this.getCookieValue('ic_device_backup');
      if (sessionId && sessionId !== currentDeviceId) {
        return true;
      }
      if (cookieId && cookieId !== currentDeviceId) {
        return true;
      }

      // 检测3：时间篡改检测
      if (trialData.startTime && trialData.startTime > Date.now()) {
        console.warn('⚠️ 检测到未来时间戳');
        return true;
      }

      // 检测4：频繁重置检测
      const resetCount = parseInt(localStorage.getItem('ic-reset-count') || '0');
      if (resetCount > 3) {
        console.warn('⚠️ 频繁重置检测');
        return true;
      }

      return false;
    } catch (error) {
      console.error('反作弊检测异常:', error);
      return false;
    }
  }

  // 获取Cookie值
  getCookieValue(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  // 记录试用结束
  recordTrialEnd() {
    const endData = {
      endTime: Date.now(),
      deviceId: this.deviceId,
      userAgent: navigator.userAgent.slice(0, 100)
    };
    localStorage.setItem('ic-trial-end', JSON.stringify(endData));
  }

  // 开始试用
  startTrial() {
    const trialData = {
      deviceId: this.deviceId,
      startTime: Date.now(),
      version: '1.0'
    };
    localStorage.setItem(this.storageKey, JSON.stringify(trialData));
  }

  // 获取试用数据
  getTrialData() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('读取试用数据失败:', error);
      return {};
    }
  }

  // 格式化剩余时间
  formatTime(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // 显示试用状态 - 完全重构避免清空输入框
  showTrialStatus(status) {
    const statusElement = document.getElementById('trial-status');
    if (!statusElement) return;
  
    // 【新方案】使用独立的状态显示和输入区域，避免HTML重新生成
    this.updateTrialStatusDisplay(status);
    this.ensureAccessCodeArea();
  }

  // 更新试用状态显示（不影响输入框）
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

    // 只更新状态显示内容，不触碰输入区域
    let statusContent = '';
    
    if (status.inExemptPeriod) {
      const remaining = this.formatTime(status.remaining);
      statusContent = `
        <div class="trial-active">
          <h3>⏰ 试用剩余时间：<strong>${remaining}</strong></h3>
        </div>
      `;
    } else if (status.expired) {
      statusContent = `
        <div class="trial-expired">
          <h3 style="color: #e74c3c;">😔 免费试用时间已用完</h3>
          <p style="color: #e74c3c;">每台设备可免费试用 10 分钟</p>
        </div>
      `;
    } else if (status.isFirstTime) {
      statusContent = `
        <div class="trial-welcome">
          <h3>🎉 欢迎试用 IC 视奏工具！</h3>
          <p>您有 <strong>10 分钟</strong> 的免费试用时间</p>
        </div>
      `;
    } else {
      const remaining = this.formatTime(status.remaining);
      statusContent = `
        <div class="trial-active">
          <h3>⏰ 试用剩余时间：<strong>${remaining}</strong></h3>
        </div>
      `;
    }

    statusDisplayDiv.innerHTML = statusContent;
  }

  // 确保访问码区域存在（只创建一次，不重复创建）
  ensureAccessCodeArea() {
    const statusElement = document.getElementById('trial-status');
    if (!statusElement) return;

    // 检查是否已有访问码区域
    let accessCodeDiv = statusElement.querySelector('#access-code-area');
    if (accessCodeDiv) {
      return; // 已存在，不需要重新创建
    }

    // 创建访问码区域（只创建一次）
    accessCodeDiv = document.createElement('div');
    accessCodeDiv.id = 'access-code-area';
    accessCodeDiv.style.marginTop = '20px';
    
    accessCodeDiv.innerHTML = `
      <h3 style="color: #667eea; margin-bottom: 10px;">输入访问码</h3>
      <div style="display: flex; gap: 10px; align-items: center;">
        <input type="text" id="access-code-input" placeholder="输入访问码(11-12位)" 
               style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; text-transform: uppercase;"
               maxlength="12">
        <button onclick="directVerifyCode()" 
                style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
          验证
        </button>
      </div>
      <div id="verify-result" style="margin-top: 10px; font-size: 14px;"></div>
      <div style="text-align: center;">
        <button id="forgot-code-btn" 
                onclick="showForgotCodeDialog()" 
                style="background: none; border: none; color: #888; font-size: 14px; text-decoration: underline; cursor: pointer; padding: 8px; transition: color 0.3s ease;"
                onmouseover="this.style.color='#667eea';"
                onmouseout="this.style.color='#888';">
          忘记访问码？点击找回
        </button>
      </div>
    `;

    statusElement.appendChild(accessCodeDiv);
    console.log('✅ 访问码输入区域已创建（一次性）');
  }

  // 初始化试用限制器
  async init() {
    const status = this.checkTrialStatus();
    
    // 服务器端验证（如果有CloudBase API）
    if (window.cloudbaseAPI && status.allowed) {
      try {
        await this.validateTrialWithServer();
      } catch (error) {
        console.warn('服务器端验证失败:', error.message);
      }
    }
    
    if (!status.allowed) {
      this.blockAccess(status.reason);
      return false;
    }

    // 确保试用期间工具可用 - 延迟调用确保DOM完全加载
    setTimeout(() => {
      this.ensureToolAccess();
      console.log('🔄 页面加载后自动启用试用工具');
    }, 100);
    
    this.showTrialStatus(status);
    this.startTimer(status.remaining);
    return true;
  }

  // 服务器端试用验证
  async validateTrialWithServer() {
    try {
      const trialData = this.getTrialData();
      const validationData = {
        action: 'validate_trial',
        device_id: this.deviceId,
        trial_start: trialData.startTime,
        user_agent: navigator.userAgent.slice(0, 100),
        timestamp: Date.now()
      };

      // 调用服务器验证
      const result = await window.cloudbaseAPI.httpRequest('/validate-trial', validationData);
      
      if (result.code !== 200) {
        console.warn('服务器端试用验证失败:', result.message);
        // 可以根据需要决定是否强制结束试用
      }
    } catch (error) {
      console.error('服务器端验证异常:', error);
    }
  }

  // 确保工具在试用期间可用
  ensureToolAccess() {
    console.log('🔓 确保视奏工具在试用期间完全可用');
    
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
      
      console.log('✅ 生成按钮已完全启用，文本已恢复为"生成旋律"');
    } else {
      console.log('❌ 未找到生成按钮');
    }
    
    // 3. 确保所有输入控件可用
    const allInputs = document.querySelectorAll('input, select, button, textarea');
    allInputs.forEach(input => {
      if (input.id !== 'generateBtn') { // 避免重复处理
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
      // 临时覆盖权限检查，在试用期间返回 true
      const originalCheck = window.checkFullAccess;
      window.checkFullAccess = function() {
        // 如果在豁免期内，返回 true 允许使用
        const exemptTime = localStorage.getItem('ic-anticheat-exempt');
        if (exemptTime && (Date.now() - parseInt(exemptTime) < 5 * 60 * 1000)) {
          return true;
        }
        // 否则检查试用状态
        if (window.trialLimiter) {
          const status = window.trialLimiter.checkTrialStatus();
          return status.allowed;
        }
        return originalCheck();
      };
      console.log('✅ 权限检查已调整为支持试用模式');
    }
    
    // 6. 隐藏支付区域（试用期间不需要显示）
    const paymentSection = document.getElementById('zpay-container');
    if (paymentSection) {
      paymentSection.style.display = 'none';
    }
    
    // 7. 隐藏访问码输入区域（试用期间不需要显示）
    const accessCodeContainer = document.getElementById('access-code-container');
    if (accessCodeContainer) {
      accessCodeContainer.style.display = 'none';
    }
    
    console.log('🎉 试用工具完全可用状态已确保');
  }

  // 阻止访问
  blockAccess() {
    console.log('🚫 试用时间已结束，阻止工具访问');
    
    // 修改生成按钮为试用结束状态
    const generateBtn = document.getElementById('generateBtn') || 
                       document.querySelector('button[onclick*="generateMelody"]') ||
                       document.querySelector('button.btn-primary');
    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.textContent = '试用已结束';
      generateBtn.innerHTML = '试用已结束';
      generateBtn.style.opacity = '0.5';
      generateBtn.style.cursor = 'not-allowed';
      console.log('🚫 生成按钮已设置为"试用已结束"');
    }
    
    // 隐藏工具界面
    const toolContainer = document.querySelector('.sight-reading-tool');
    if (toolContainer) {
      toolContainer.style.display = 'none';
    }

    // 显示购买提示
    this.showTrialStatus({ expired: true });
    
    // 显示支付区域
    const paymentSection = document.getElementById('zpay-container');
    if (paymentSection) {
      paymentSection.style.display = 'block';
      // 滚动到购买区域
      setTimeout(() => {
        paymentSection.scrollIntoView({ behavior: 'smooth' });
      }, 1000);
    }
  }

  // 启动定时器
  startTimer(remaining) {
    const timer = setInterval(() => {
      const status = this.checkTrialStatus();
      
      if (!status.allowed) {
        clearInterval(timer);
        this.blockAccess();
        return;
      }

      // 【修复】恢复正常更新频率，让计时器每秒更新
      this.showTrialStatus(status);

      // 警告功能已移除
    }, 1000); // 每秒更新一次，提供实时计时
    
    // 启动定时器时也确保工具可用
    setTimeout(() => {
      this.ensureToolAccess();
      console.log('🔄 定时器启动后再次确保工具可用');
    }, 500);
  }

  // 显示警告提示
  showWarning() {
    const warning = document.createElement('div');
    warning.className = 'trial-warning-popup';
    warning.innerHTML = `
      <div class="warning-content">
        <h3>⚠️ 试用时间即将结束</h3>
        <p>还剩不到 5 分钟的试用时间</p>
        <p>购买完整版可永久使用所有功能</p>
        <div class="warning-buttons">
          <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn-secondary">继续试用</button>
          <a href="#zpay-container" onclick="this.parentElement.parentElement.parentElement.remove()" class="btn-primary">立即购买</a>
        </div>
      </div>
    `;
    
    document.body.appendChild(warning);
    
    // 3秒后自动关闭
    setTimeout(() => {
      if (warning.parentElement) {
        warning.remove();
      }
    }, 10000);
  }
}

// 全局实例
window.trialLimiter = new TrialLimiter();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  if (window.location.pathname.includes('sight-reading-generator') || 
      document.querySelector('.sight-reading-tool')) {
    
    // 检查是否有有效的访问码，如果有则跳过试用限制
    const hasValidAccess = window.checkFullAccess && window.checkFullAccess();
    if (!hasValidAccess) {
      console.log('🔄 启动试用限制器...');
      window.trialLimiter.init();
      
      // 额外的延迟确保，防止其他代码干扰
      setTimeout(() => {
        const status = window.trialLimiter.checkTrialStatus();
        if (status.allowed) {
          window.trialLimiter.ensureToolAccess();
          console.log('🛡️ 页面加载完成后再次确保试用工具可用');
        }
      }, 1000);
      
      // 再次确保 - 防止UI管理器等其他代码干扰
      setTimeout(() => {
        const status = window.trialLimiter.checkTrialStatus();
        if (status.allowed) {
          window.trialLimiter.ensureToolAccess();
          console.log('🔐 最终确保试用工具可用状态');
        }
      }, 2000);
      
    } else {
      console.log('✅ 检测到有效访问码，跳过试用限制');
    }
  }
});