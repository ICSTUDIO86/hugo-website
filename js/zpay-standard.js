/**
 * Z-Pay 易支付标准接口实现
 * 根据官方文档 https://z-pay.cn/member/doc.html
 * 版本: 1.0.0
 */

class ZPayStandard {
  constructor() {
    // 易支付配置
    this.config = {
      // 支付网关地址
      gateway: 'https://zpayz.cn/submit.php',
      // 商户ID
      pid: '2025090607243839',
      // 商户密钥
      key: 'UoA5vDBCe51EyVzdK2Fu2udBO1SAadjN',
      // 支付金额
      money: '248.00',
      // 签名方式
      signType: 'MD5'
    };
    
    console.log('💳 Z-Pay 易支付系统初始化完成');
    this.init();
  }

  init() {
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.bindEvents());
    } else {
      this.bindEvents();
    }
  }

  bindEvents() {
    // 绑定支付按钮
    const payButton = document.getElementById('zpay-btn');
    if (payButton) {
      payButton.onclick = () => this.createPayment();
      console.log('✅ 支付按钮已绑定');
    }
  }

  /**
   * 生成订单号
   */
  generateOrderId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `IC${timestamp}${random}`;
  }

  /**
   * MD5加密函数
   */
  md5(str) {
    // 使用标准MD5算法
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

    return hex(md51(str));
  }

  /**
   * 生成签名（按照易支付标准）
   */
  generateSign(params) {
    // 1. 过滤空值和sign、sign_type参数
    const filtered = {};
    for (const key in params) {
      if (params[key] !== '' && params[key] !== null && 
          params[key] !== undefined && key !== 'sign' && key !== 'sign_type') {
        filtered[key] = params[key];
      }
    }

    // 2. 按参数名ASCII码升序排序
    const sortedKeys = Object.keys(filtered).sort();
    
    // 3. 拼接成key=value&key=value格式
    let signStr = '';
    sortedKeys.forEach((key, index) => {
      if (index > 0) signStr += '&';
      signStr += `${key}=${filtered[key]}`;
    });

    // 4. 在最后拼接上key=商户密钥
    signStr += `&key=${this.config.key}`;

    console.log('签名原始字符串:', signStr);

    // 5. MD5加密并转小写
    const sign = this.md5(signStr).toLowerCase();
    console.log('生成的签名:', sign);

    return sign;
  }

  /**
   * 创建支付订单
   */
  createPayment() {
    console.log('🚀 开始创建支付订单...');

    // 生成订单号
    const orderId = this.generateOrderId();
    console.log('订单号:', orderId);

    // 构建支付参数（按照易支付文档）
    // 注意：参数顺序很重要，避免notify_url的编码问题
    const params = {
      pid: this.config.pid,
      type: 'alipay',
      out_trade_no: orderId,
      name: 'IC Studio 视奏工具',
      money: this.config.money,
      sitename: 'IC Studio',
      return_url: `${window.location.origin}/sight-reading-tool/`
    };
    
    // notify_url 单独处理，避免编码问题
    params['notifyurl'] = 'https://icstudio.club/api/notify';

    // 生成签名
    params.sign = this.generateSign(params);
    params.sign_type = this.config.signType;

    console.log('支付参数:', params);

    // 创建表单并提交
    this.submitPaymentForm(params);
  }

  /**
   * 提交支付表单
   */
  submitPaymentForm(params) {
    // 创建表单
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = this.config.gateway;
    form.target = '_self';
    form.style.display = 'none';

    // 添加参数
    for (const key in params) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = params[key];
      form.appendChild(input);
    }

    // 添加到页面并提交
    document.body.appendChild(form);
    
    // 显示提交提示
    this.showLoadingMessage();
    
    // 延迟提交，让用户看到提示
    setTimeout(() => {
      console.log('提交支付表单...');
      form.submit();
    }, 1000);
  }

  /**
   * 显示加载提示
   */
  showLoadingMessage() {
    // 如果已有提示，先移除
    const existingMsg = document.getElementById('zpay-loading');
    if (existingMsg) existingMsg.remove();

    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'zpay-loading';
    loadingDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px 40px;
      border-radius: 10px;
      font-size: 16px;
      font-weight: bold;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      z-index: 999999;
      animation: pulse 1.5s infinite;
    `;
    loadingDiv.innerHTML = '正在跳转到支付宝...';

    // 添加动画样式
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes pulse {
        0%, 100% { transform: translate(-50%, -50%) scale(1); }
        50% { transform: translate(-50%, -50%) scale(1.05); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(loadingDiv);
  }

  /**
   * 处理支付回调
   */
  handleCallback(params) {
    console.log('处理支付回调:', params);
    
    // 验证签名
    const sign = params.sign;
    delete params.sign;
    delete params.sign_type;
    
    const expectedSign = this.generateSign(params);
    if (sign === expectedSign) {
      console.log('✅ 签名验证成功');
      // 处理成功逻辑
      this.onPaymentSuccess(params);
    } else {
      console.error('❌ 签名验证失败');
    }
  }

  /**
   * 支付成功处理
   */
  onPaymentSuccess(params) {
    console.log('支付成功!', params);
    
    // 调用全局支付成功处理器
    if (window.showUnifiedPaymentSuccess) {
      // 生成访问码
      const accessCode = this.generateAccessCode();
      window.showUnifiedPaymentSuccess(accessCode, 'zpay-standard');
    }
  }

  /**
   * 生成访问码
   */
  generateAccessCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

// 创建全局实例
window.zpayStandard = new ZPayStandard();

// 监听页面加载完成
document.addEventListener('DOMContentLoaded', function() {
  console.log('✅ Z-Pay 标准接口已加载');
  
  // 检查URL参数，处理支付回调
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('trade_no') || urlParams.get('out_trade_no')) {
    const callbackParams = {};
    urlParams.forEach((value, key) => {
      callbackParams[key] = value;
    });
    window.zpayStandard.handleCallback(callbackParams);
  }
});
