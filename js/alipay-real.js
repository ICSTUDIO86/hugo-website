/**
 * IC Studio - 真实支付宝支付集成
 * 使用 ZPayz.cn 支付网关
 */

class RealAlipayPayment {
  constructor() {
    this.config = {
      gateway: 'https://zpayz.cn/submit.php',
      merchantId: '2025090607243839',
      merchantKey: 'UoA5vDBCe51EyVzdK2Fu2udBO1SAadjN',
      amount: 128.00,
      currency: 'CNY',
      productName: 'IC Studio 视奏工具',
      productDescription: '专业级音乐视奏训练工具 - 终身访问'
    };
    
    // 验证关键配置
    if (!this.config.merchantKey || this.config.merchantKey.length < 10) {
      console.error('❌ 商户密钥配置错误');
    }
    
    console.log('🚀 真实支付宝支付系统初始化');
    
    // 在页面上显示版本信息，方便用户确认
    this.showVersionInfo();
  }

  // 生成订单号
  generateOrderId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `IC${timestamp}${random}`;
  }

  // 生成支付签名 - 确保UTF-8编码
  generateSign(params) {
    console.log('🔒 开始生成签名，原始参数:', params);
    
    // 1. 过滤参数：移除sign、sign_type和空值
    const filteredParams = {};
    Object.keys(params).forEach(key => {
      if (key !== 'sign' && key !== 'sign_type') {
        const value = params[key];
        if (value !== '' && value !== null && value !== undefined) {
          // 确保所有值都是字符串，且没有特殊字符
          filteredParams[key] = String(value).trim();
        }
      }
    });
    
    console.log('🔒 过滤后参数:', filteredParams);
    
    // 2. 按键名升序排列
    const sortedKeys = Object.keys(filteredParams).sort();
    console.log('🔒 排序后的键:', sortedKeys);
    
    // 3. 构建查询字符串 - 确保正确的UTF-8编码
    const paramPairs = [];
    sortedKeys.forEach(key => {
      const value = filteredParams[key];
      // 不对参数进行URL编码，保持原始值用于签名
      paramPairs.push(`${key}=${value}`);
    });
    
    console.log('🔒 参数对列表:', paramPairs);
    
    // 4. 拼接商户密钥
    const queryString = paramPairs.join('&');
    const signString = queryString + '&key=' + this.config.merchantKey;
    
    console.log('🔒 查询字符串:', queryString);
    console.log('🔒 签名字符串长度:', signString.length);
    
    // 检查是否有非ASCII字符
    if (!/^[\x00-\x7F]*$/.test(signString)) {
      console.log('⚠️ 签名字符串包含非ASCII字符');
      // 对中文进行UTF-8编码处理
      const encoder = new TextEncoder();
      const data = encoder.encode(signString);
      console.log('🔒 UTF-8编码后字节数:', data.length);
    }
    
    // 5. MD5加密并转小写
    const signature = this.md5(signString).toLowerCase();
    console.log('🔒 生成的MD5签名:', signature);
    
    return signature;
  }

  // 真正的 MD5 实现
  md5(string) {
    return this.cryptoMD5(string);
  }

  // 标准 MD5 哈希算法实现
  cryptoMD5(str) {
    function md5cycle(x, k) {
      var a = x[0], b = x[1], c = x[2], d = x[3];
      a = ff(a, b, c, d, k[0], 7, -680876936);
      d = ff(d, a, b, c, k[1], 12, -389564586);
      c = ff(c, d, a, b, k[2], 17, 606105819);
      b = ff(b, c, d, a, k[3], 22, -1044525330);
      a = ff(a, b, c, d, k[4], 7, -176418897);
      d = ff(d, a, b, c, k[5], 12, 1200080426);
      c = ff(c, d, a, b, k[6], 17, -1473231341);
      b = ff(b, c, d, a, k[7], 22, -45705983);
      a = ff(a, b, c, d, k[8], 7, 1770035416);
      d = ff(d, a, b, c, k[9], 12, -1958414417);
      c = ff(c, d, a, b, k[10], 17, -42063);
      b = ff(b, c, d, a, k[11], 22, -1990404162);
      a = ff(a, b, c, d, k[12], 7, 1804603682);
      d = ff(d, a, b, c, k[13], 12, -40341101);
      c = ff(c, d, a, b, k[14], 17, -1502002290);
      b = ff(b, c, d, a, k[15], 22, 1236535329);
      a = gg(a, b, c, d, k[1], 5, -165796510);
      d = gg(d, a, b, c, k[6], 9, -1069501632);
      c = gg(c, d, a, b, k[11], 14, 643717713);
      b = gg(b, c, d, a, k[0], 20, -373897302);
      a = gg(a, b, c, d, k[5], 5, -701558691);
      d = gg(d, a, b, c, k[10], 9, 38016083);
      c = gg(c, d, a, b, k[15], 14, -660478335);
      b = gg(b, c, d, a, k[4], 20, -405537848);
      a = gg(a, b, c, d, k[9], 5, 568446438);
      d = gg(d, a, b, c, k[14], 9, -1019803690);
      c = gg(c, d, a, b, k[3], 14, -187363961);
      b = gg(b, c, d, a, k[8], 20, 1163531501);
      a = gg(a, b, c, d, k[13], 5, -1444681467);
      d = gg(d, a, b, c, k[2], 9, -51403784);
      c = gg(c, d, a, b, k[7], 14, 1735328473);
      b = gg(b, c, d, a, k[12], 20, -1926607734);
      a = hh(a, b, c, d, k[5], 4, -378558);
      d = hh(d, a, b, c, k[8], 11, -2022574463);
      c = hh(c, d, a, b, k[11], 16, 1839030562);
      b = hh(b, c, d, a, k[14], 23, -35309556);
      a = hh(a, b, c, d, k[1], 4, -1530992060);
      d = hh(d, a, b, c, k[4], 11, 1272893353);
      c = hh(c, d, a, b, k[7], 16, -155497632);
      b = hh(b, c, d, a, k[10], 23, -1094730640);
      a = hh(a, b, c, d, k[13], 4, 681279174);
      d = hh(d, a, b, c, k[0], 11, -358537222);
      c = hh(c, d, a, b, k[3], 16, -722521979);
      b = hh(b, c, d, a, k[6], 23, 76029189);
      a = hh(a, b, c, d, k[9], 4, -640364487);
      d = hh(d, a, b, c, k[12], 11, -421815835);
      c = hh(c, d, a, b, k[15], 16, 530742520);
      b = hh(b, c, d, a, k[2], 23, -995338651);
      a = ii(a, b, c, d, k[0], 6, -198630844);
      d = ii(d, a, b, c, k[7], 10, 1126891415);
      c = ii(c, d, a, b, k[14], 15, -1416354905);
      b = ii(b, c, d, a, k[5], 21, -57434055);
      a = ii(a, b, c, d, k[12], 6, 1700485571);
      d = ii(d, a, b, c, k[3], 10, -1894986606);
      c = ii(c, d, a, b, k[10], 15, -1051523);
      b = ii(b, c, d, a, k[1], 21, -2054922799);
      a = ii(a, b, c, d, k[8], 6, 1873313359);
      d = ii(d, a, b, c, k[15], 10, -30611744);
      c = ii(c, d, a, b, k[6], 15, -1560198380);
      b = ii(b, c, d, a, k[13], 21, 1309151649);
      a = ii(a, b, c, d, k[4], 6, -145523070);
      d = ii(d, a, b, c, k[11], 10, -1120210379);
      c = ii(c, d, a, b, k[2], 15, 718787259);
      b = ii(b, c, d, a, k[9], 21, -343485551);
      x[0] = add32(a, x[0]);
      x[1] = add32(b, x[1]);
      x[2] = add32(c, x[2]);
      x[3] = add32(d, x[3]);
    }

    function cmn(q, a, b, x, s, t) {
      a = add32(add32(a, q), add32(x, t));
      return add32((a << s) | (a >>> (32 - s)), b);
    }

    function ff(a, b, c, d, x, s, t) {
      return cmn((b & c) | ((~b) & d), a, b, x, s, t);
    }

    function gg(a, b, c, d, x, s, t) {
      return cmn((b & d) | (c & (~d)), a, b, x, s, t);
    }

    function hh(a, b, c, d, x, s, t) {
      return cmn(b ^ c ^ d, a, b, x, s, t);
    }

    function ii(a, b, c, d, x, s, t) {
      return cmn(c ^ (b | (~d)), a, b, x, s, t);
    }

    function add32(a, b) {
      return (a + b) & 0xFFFFFFFF;
    }

    function md51(s) {
      var txt = '';
      var n = s.length;
      var state = [1732584193, -271733879, -1732584194, 271733878];
      var i;
      for (i = 64; i <= s.length; i += 64) {
        md5cycle(state, md5blk(s.substring(i - 64, i)));
      }
      s = s.substring(i - 64);
      var tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (i = 0; i < s.length; i++) {
        tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
      }
      tail[i >> 2] |= 0x80 << ((i % 4) << 3);
      if (i > 55) {
        md5cycle(state, tail);
        for (i = 0; i < 16; i++) tail[i] = 0;
      }
      tail[14] = n * 8;
      md5cycle(state, tail);
      return state;
    }

    function md5blk(s) {
      var md5blks = [], i;
      for (i = 0; i < 64; i += 4) {
        md5blks[i >> 2] = s.charCodeAt(i)
          + (s.charCodeAt(i + 1) << 8)
          + (s.charCodeAt(i + 2) << 16)
          + (s.charCodeAt(i + 3) << 24);
      }
      return md5blks;
    }

    function rhex(n) {
      var hex_chr = '0123456789abcdef'.split('');
      var s = '', j = 0;
      for (; j < 4; j++) {
        s += hex_chr[(n >> (j * 8 + 4)) & 0x0F]
          + hex_chr[(n >> (j * 8)) & 0x0F];
      }
      return s;
    }

    function hex(x) {
      for (var i = 0; i < x.length; i++) {
        x[i] = rhex(x[i]);
      }
      return x.join('');
    }

    return hex(md51(str)).toLowerCase();
  }

  // 显示版本信息
  showVersionInfo() {
    // 创建版本显示元素
    const versionDiv = document.createElement('div');
    versionDiv.id = 'payment-version-info';
    versionDiv.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #f0f9ff;
      border: 1px solid #0ea5e9;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      color: #0369a1;
      z-index: 9999;
      font-family: monospace;
    `;
    versionDiv.innerHTML = `支付系统 v20250909-17 ✅`;
    
    // 5秒后自动隐藏
    setTimeout(() => {
      if (versionDiv.parentNode) {
        versionDiv.remove();
      }
    }, 5000);
    
    document.body.appendChild(versionDiv);
  }

  // 显示简化的支付日志（用户友好版本）
  showPaymentLog(message) {
    let logContainer = document.getElementById('payment-log');
    if (!logContainer) {
      logContainer = document.createElement('div');
      logContainer.id = 'payment-log';
      logContainer.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        max-width: 400px;
        background: #fefefe;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 10px;
        font-size: 12px;
        color: #374151;
        z-index: 9999;
        font-family: monospace;
        max-height: 200px;
        overflow-y: auto;
      `;
      document.body.appendChild(logContainer);
    }
    
    const logEntry = document.createElement('div');
    logEntry.textContent = new Date().toLocaleTimeString() + ': ' + message;
    logContainer.appendChild(logEntry);
    
    // 滚动到底部
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  // 发起支付
  initiatePayment() {
    console.log('💳 发起真实支付宝支付');
    this.showPaymentLog('开始支付流程...');
    
    try {
      const orderId = this.generateOrderId();
      console.log('📋 订单号:', orderId);
      this.showPaymentLog('生成订单号: ' + orderId);
      
      // 显示配置信息供调试
      this.showPaymentLog('商户ID: ' + this.config.merchantId);
      this.showPaymentLog('网关: ' + this.config.gateway);
      
      // 构建支付参数 - 使用简短的URL避免编码问题
      const paymentParams = {
        'pid': this.config.merchantId,
        'type': 'alipay',
        'out_trade_no': orderId,
        'notify_url': 'https://icstudio.club/api/callback',
        'return_url': `${window.location.origin}/sight-reading-tool/`,
        'name': this.config.productName,
        'money': this.config.amount.toFixed(2),
        'clientip': '192.168.1.1',
        'device': 'pc',
        'param': orderId
      };
      
      console.log('🔧 商户配置检查:');
      console.log('- 商户ID:', this.config.merchantId);
      console.log('- 商户密钥:', this.config.merchantKey ? '✅ 已配置' : '❌ 未配置');
      console.log('- 商户密钥前6位:', this.config.merchantKey ? this.config.merchantKey.substring(0, 6) + '...' : 'N/A');
      
      this.showPaymentLog('检查商户配置... ✅');

      // 生成签名
      this.showPaymentLog('正在生成支付签名...');
      paymentParams.sign = this.generateSign(paymentParams);
      paymentParams.sign_type = 'MD5';
      
      this.showPaymentLog('签名生成完成: ' + paymentParams.sign.substring(0, 8) + '...');

      console.log('📤 支付参数:', paymentParams);

      // 创建支付表单并自动提交
      this.showPaymentLog('创建支付表单并跳转...');
      this.createPaymentForm(paymentParams);

      // 异步调用 CloudBase 预创建订单记录（不等待结果）
      this.preCreateOrder(orderId, paymentParams).catch(err => {
        console.warn('CloudBase订单预创建失败:', err);
      });

    } catch (error) {
      console.error('❌ 支付发起失败:', error);
      console.error('❌ 错误堆栈:', error.stack);
      this.showPaymentLog('❌ 支付发起失败: ' + error.message);
      
      // 显示详细错误信息
      const errorDetail = `
错误类型: ${error.name}
错误信息: ${error.message}
发生位置: ${error.stack ? error.stack.split('\n')[1] : '未知'}
      `.trim();
      
      console.log('❌ 详细错误信息:', errorDetail);
      this.showPaymentLog('详细错误: ' + error.name + ' - ' + error.message);
      
      alert('支付发起失败: ' + error.message + '\n\n请查看页面左下角的详细日志');
    }
  }

  // 获取客户端 IP（简化版）
  async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.warn('获取 IP 失败，使用默认值');
      return '127.0.0.1';
    }
  }

  // 创建支付表单并提交 - 使用POST方式确保稳定性
  createPaymentForm(params) {
    console.log('🚀 使用POST方式提交支付表单');
    this.showPaymentLog('构建支付表单参数...');
    
    // 验证参数完整性
    const requiredParams = ['pid', 'type', 'out_trade_no', 'notify_url', 'return_url', 'name', 'money', 'sign'];
    const missingParams = requiredParams.filter(param => !params.hasOwnProperty(param));
    
    if (missingParams.length > 0) {
      console.error('❌ 缺少必要参数:', missingParams);
      this.showPaymentLog('❌ 缺少必要参数: ' + missingParams.join(', '));
      return;
    }
    
    console.log('✅ 参数验证通过，开始构建表单');
    this.showPaymentLog('✅ 参数验证通过，构建支付表单...');
    
    // 创建表单，使用严格的编码设置
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = this.config.gateway;
    form.style.display = 'none';
    form.acceptCharset = 'UTF-8';
    form.enctype = 'application/x-www-form-urlencoded';
    
    // 添加表单参数
    Object.keys(params).forEach(key => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      
      let value = params[key];
      if (typeof value !== 'string') {
        value = String(value);
      }
      
      input.value = value;
      form.appendChild(input);
      
      console.log(`📝 表单参数: ${key} = ${value.length > 50 ? value.substring(0, 50) + '...' : value}`);
    });

    document.body.appendChild(form);
    
    console.log('📝 表单创建完成，准备提交');
    console.log('📝 表单action:', form.action);
    console.log('📝 表单method:', form.method);
    console.log('📝 表单参数数量:', form.elements.length);
    
    this.showPaymentLog(`✅ 支付表单准备完成 (${form.elements.length}个参数)`);
    
    // 显示提交前提示
    const submitNotice = document.createElement('div');
    submitNotice.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #1677FF 0%, #00A0E9 100%);
      color: white;
      padding: 20px 30px;
      text-decoration: none;
      border-radius: 12px;
      z-index: 99999;
      font-weight: bold;
      box-shadow: 0 8px 25px rgba(22, 119, 255, 0.3);
      font-size: 16px;
      text-align: center;
    `;
    submitNotice.innerHTML = `
      <div style="margin-bottom: 10px;">🚀</div>
      <div>正在跳转到支付宝...</div>
      <div style="font-size: 12px; margin-top: 10px; opacity: 0.8;">如果页面没有自动跳转，请稍后手动刷新</div>
    `;
    document.body.appendChild(submitNotice);
    
    this.showPaymentLog('🚀 正在提交到支付网关...');
    
    // 3秒后提交表单
    setTimeout(() => {
      console.log('🚀 提交支付表单到:', this.config.gateway);
      this.showPaymentLog('✅ 正在跳转到支付宝...');
      form.submit();
    }, 3000);
  }

  // 确保页面UTF-8编码
  ensureUTF8Encoding() {
    // 确保页面有UTF-8 meta标签
    if (!document.querySelector('meta[charset="UTF-8"]')) {
      const meta = document.createElement('meta');
      meta.setAttribute('charset', 'UTF-8');
      document.head.insertBefore(meta, document.head.firstChild);
      console.log('✅ 已添加UTF-8 meta标签');
    }
    
    // 设置HTTP等效标签
    if (!document.querySelector('meta[http-equiv="Content-Type"]')) {
      const httpMeta = document.createElement('meta');
      httpMeta.setAttribute('http-equiv', 'Content-Type');
      httpMeta.setAttribute('content', 'text/html; charset=UTF-8');
      document.head.appendChild(httpMeta);
      console.log('✅ 已设置HTTP Content-Type');
    }
  }

  // 方法1：使用GET方式提交（避免POST编码问题）
  submitViaGET(params) {
    try {
      this.showPaymentLog('分析支付参数...');
      
      // 详细记录每个参数
      console.log('🔍 详细参数分析:');
      Object.keys(params).forEach(key => {
        const value = String(params[key]);
        console.log(`  ${key}: ${value}`);
        this.showPaymentLog(`参数 ${key}: ${value.length > 30 ? value.substring(0, 30) + '...' : value}`);
      });
      
      // 构建查询字符串 - 特殊处理中文参数
      const queryPairs = Object.keys(params).map(key => {
        const rawValue = String(params[key]);
        let encodedKey = encodeURIComponent(key);
        let encodedValue = encodeURIComponent(rawValue);
        
        // 特殊处理容易出错的参数
        if (key === 'notify_url') {
          console.log('🔧 特殊处理 notify_url');
          // 使用更严格的编码
          encodedValue = encodeURIComponent(rawValue).replace(/'/g, '%27').replace(/"/g, '%22');
        }
        
        if (key === 'param') {
          console.log('🔧 特殊处理 param JSON');
          // JSON参数需要特殊处理
          encodedValue = encodeURIComponent(rawValue).replace(/'/g, '%27').replace(/"/g, '%22');
        }
        
        if (key === 'name' && rawValue.includes('视奏工具')) {
          console.log('🔧 特殊处理中文产品名称');
          // 中文名称使用UTF-8编码
          encodedValue = encodeURIComponent(rawValue);
        }
        
        console.log(`🔗 编码: ${key} -> ${encodedKey}`);
        console.log(`🔗 值: ${rawValue.substring(0, 50)}... -> ${encodedValue.substring(0, 50)}...`);
        
        return `${encodedKey}=${encodedValue}`;
      });
      
      const queryString = queryPairs.join('&');
      const fullUrl = `${this.config.gateway}submit.php?${queryString}`;
      
      console.log('🔗 完整URL长度:', fullUrl.length);
      console.log('🔗 网关地址:', this.config.gateway);
      console.log('🔗 查询字符串前100字符:', queryString.substring(0, 100) + '...');
      
      this.showPaymentLog(`URL长度: ${fullUrl.length} 字符`);
      this.showPaymentLog('准备跳转到支付页面...');
      
      // 添加倒计时，让用户看到日志
      let countdown = 5;
      this.showPaymentLog(`${countdown}秒后跳转...`);
      
      const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          this.showPaymentLog(`${countdown}秒后跳转...`);
        } else {
          clearInterval(countdownInterval);
          console.log('🚀 开始跳转到:', fullUrl.substring(0, 150) + '...');
          this.showPaymentLog('正在跳转到支付宝...');
          
          // 显示完整URL供调试
          console.log('🔗 完整跳转URL:', fullUrl);
          
          // 先在新窗口测试URL，避免影响当前页面
          const testLink = document.createElement('a');
          testLink.href = fullUrl;
          testLink.target = '_blank';
          testLink.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 20px;
            background: #1677FF;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            z-index: 99999;
            font-weight: bold;
          `;
          testLink.textContent = '点击测试支付链接';
          document.body.appendChild(testLink);
          
          this.showPaymentLog('支付链接已生成，请点击页面中央的蓝色按钮测试');
          
          // 10秒后自动跳转
          setTimeout(() => {
            window.location.href = fullUrl;
          }, 10000);
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ GET提交失败:', error);
      this.showPaymentLog('❌ GET提交失败: ' + error.message);
      this.showPaymentLog('尝试POST方式...');
      // 如果GET失败，回退到POST
      this.submitViaPOST(params);
    }
  }

  // 优化的POST提交方法
  submitViaPOST(params) {
    console.log('🔄 使用全新方法：直接URL参数构建');
    this.showPaymentLog('构建支付URL参数...');
    
    // 检查页面字符集（只读，无需设置）
    console.log('📝 当前页面字符集:', document.characterSet || document.charset || 'unknown');
    
    // 创建表单，使用最严格的编码设置
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = this.config.gateway; // gateway已经包含完整URL
    form.style.display = 'none';
    form.acceptCharset = 'utf-8';
    form.enctype = 'application/x-www-form-urlencoded';
    
    // 设置表单的字符编码
    form.setAttribute('accept-charset', 'utf-8');

    this.showPaymentLog('添加支付参数...');
    
    // 添加参数，确保字符编码正确
    Object.keys(params).forEach(key => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      
      let value = params[key];
      if (typeof value !== 'string') {
        value = String(value);
      }
      
      // 确保字符串的UTF-8编码
      input.setAttribute('value', value);
      input.value = value;
      
      form.appendChild(input);
      
      console.log(`📝 POST参数: ${key} = ${value.length > 50 ? value.substring(0, 50) + '...' : value}`);
      this.showPaymentLog(`添加参数 ${key}: ${value.length > 30 ? value.substring(0, 30) + '...' : value}`);
    });

    document.body.appendChild(form);
    
    console.log('📝 表单创建完成，准备提交');
    console.log('📝 表单action:', form.action);
    console.log('📝 表单method:', form.method);
    console.log('📝 表单enctype:', form.enctype);
    console.log('📝 表单acceptCharset:', form.acceptCharset);
    
    this.showPaymentLog('POST表单准备完成，即将提交...');
    
    // 立即提交，不延迟
    setTimeout(() => {
      console.log('🚀 提交POST表单');
      this.showPaymentLog('正在提交到支付网关...');
      form.submit();
    }, 2000);
  }

  // 预创建订单记录
  async preCreateOrder(orderId, paymentParams) {
    try {
      console.log('📝 预创建订单记录');
      
      const orderData = {
        orderId: orderId,
        paymentMethod: 'alipay-real',
        amount: this.config.amount,
        currency: this.config.currency,
        status: 'pending',
        createdAt: new Date().toISOString(),
        paymentParams: paymentParams,
        productName: this.config.productName
      };

      // 保存到 localStorage 以便支付成功后使用
      localStorage.setItem(`order_${orderId}`, JSON.stringify(orderData));
      console.log('💾 订单信息已保存到本地');

    } catch (error) {
      console.error('❌ 预创建订单失败:', error);
    }
  }

  // 显示支付状态
  showPaymentStatus(message) {
    // 移除现有状态
    const existingStatus = document.getElementById('payment-status');
    if (existingStatus) {
      existingStatus.remove();
    }

    // 创建新状态显示
    const statusDiv = document.createElement('div');
    statusDiv.id = 'payment-status';
    statusDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #1677FF 0%, #00A0E9 100%);
      color: white;
      padding: 20px 30px;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(22, 119, 255, 0.3);
      z-index: 10000;
      text-align: center;
      font-size: 16px;
      font-weight: 600;
    `;
    statusDiv.innerHTML = `
      <div style="margin-bottom: 10px;">💳</div>
      <div>${message}</div>
    `;

    document.body.appendChild(statusDiv);
  }

  // 处理支付成功回调
  async handlePaymentSuccess(params) {
    console.log('✅ 支付成功回调:', params);
    
    try {
      // 验证回调签名
      if (!this.verifyCallback(params)) {
        throw new Error('回调签名验证失败');
      }

      const orderId = params.out_trade_no;
      
      // 调用 CloudBase 生成访问码
      if (window.cloudbaseAPI && window.cloudbaseAPI.generateAccessCode) {
        const result = await window.cloudbaseAPI.generateAccessCode({
          orderId: orderId,
          paymentMethod: 'alipay-real',
          amount: parseFloat(params.money),
          currency: 'CNY',
          merchantId: this.config.merchantId,
          transactionId: params.trade_no,
          deviceId: window.trialLimiter?.deviceId || 'alipay-real-browser'
        });

        if (result.success && result.accessCode) {
          console.log('🎫 真实支付宝访问码生成成功:', result.accessCode);
          
          // 显示支付成功页面
          this.showPaymentSuccessPage(result.accessCode);
        } else {
          throw new Error('访问码生成失败');
        }
      } else {
        throw new Error('CloudBase API 不可用');
      }

    } catch (error) {
      console.error('❌ 支付回调处理失败:', error);
      alert('支付成功但处理过程中出现错误，请联系客服');
    }
  }

  // 验证回调签名
  verifyCallback(params) {
    const receivedSign = params.sign;
    delete params.sign;
    delete params.sign_type;
    
    const expectedSign = this.generateSign(params);
    const isValid = receivedSign === expectedSign;
    
    console.log('🔐 签名验证:', isValid ? '通过' : '失败');
    return isValid;
  }

  // 显示支付成功页面
  showPaymentSuccessPage(accessCode) {
    // 调用统一支付成功处理函数
    if (window.showUnifiedPaymentSuccess) {
      window.showUnifiedPaymentSuccess(accessCode, 'alipay-real');
    } else {
      // 备用显示方法
      alert(`✅ 支付成功！\n您的访问码是: ${accessCode}\n\n请保存此访问码，用于激活完整版功能。`);
    }
  }
}

// 创建全局实例
window.realAlipayPayment = new RealAlipayPayment();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RealAlipayPayment;
}