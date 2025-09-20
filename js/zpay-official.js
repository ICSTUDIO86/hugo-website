/**
 * Z-Pay 官方标准实现 - 严格按照官方文档
 * 解决notify_url字符替换问题
 */

(function() {
  'use strict';

  // 配置
  const CONFIG = {
    gateway: 'https://zpayz.cn/submit.php',
    pid: '2025090607243839', 
    key: 'UoA5vDBCe51EyVzdK2Fu2udBO1SAadjN',
    money: '48.00'
  };

  // MD5函数 - 完整实现
  !function(n){"use strict";function d(n,t){var r=(65535&n)+(65535&t);return(n>>16)+(t>>16)+(r>>16)<<16|65535&r}function f(n,t,r,e,o,u){return d((u=d(d(t,n),d(e,u)))<<o|u>>>32-o,r)}function l(n,t,r,e,o,u,c){return f(t&r|~t&e,n,t,o,u,c)}function g(n,t,r,e,o,u,c){return f(t&e|r&~e,n,t,o,u,c)}function v(n,t,r,e,o,u,c){return f(t^r^e,n,t,o,u,c)}function m(n,t,r,e,o,u,c){return f(r^(t|~e),n,t,o,u,c)}function c(n,t){var r,e,o,u;n[t>>5]|=128<<t%32,n[14+(t+64>>>9<<4)]=t;for(var c=1732584193,f=-271733879,i=-1732584194,a=271733878,h=0;h<n.length;h+=16)c=l(r=c,e=f,o=i,u=a,n[h],7,-680876936),a=l(a,c,f,i,n[h+1],12,-389564586),i=l(i,a,c,f,n[h+2],17,606105819),f=l(f,i,a,c,n[h+3],22,-1044525330),c=l(c,f,i,a,n[h+4],7,-176418897),a=l(a,c,f,i,n[h+5],12,1200080426),i=l(i,a,c,f,n[h+6],17,-1473231341),f=l(f,i,a,c,n[h+7],22,-45705983),c=l(c,f,i,a,n[h+8],7,1770035416),a=l(a,c,f,i,n[h+9],12,-1958414417),i=l(i,a,c,f,n[h+10],17,-42063),f=l(f,i,a,c,n[h+11],22,-1990404162),c=l(c,f,i,a,n[h+12],7,1804603682),a=l(a,c,f,i,n[h+13],12,-40341101),i=l(i,a,c,f,n[h+14],17,-1502002290),f=l(f,i,a,c,n[h+15],22,1236535329),c=g(c,f,i,a,n[h+1],5,-165796510),a=g(a,c,f,i,n[h+6],9,-1069501632),i=g(i,a,c,f,n[h+11],14,643717713),f=g(f,i,a,c,n[h],20,-373897302),c=g(c,f,i,a,n[h+5],5,-701558691),a=g(a,c,f,i,n[h+10],9,38016083),i=g(i,a,c,f,n[h+15],14,-660478335),f=g(f,i,a,c,n[h+4],20,-405537848),c=g(c,f,i,a,n[h+9],5,568446438),a=g(a,c,f,i,n[h+14],9,-1019803690),i=g(i,a,c,f,n[h+3],14,-187363961),f=g(f,i,a,c,n[h+8],20,1163531501),c=g(c,f,i,a,n[h+13],5,-1444681467),a=g(a,c,f,i,n[h+2],9,-51403784),i=g(i,a,c,f,n[h+7],14,1735328473),f=g(f,i,a,c,n[h+12],20,-1926607734),c=v(c,f,i,a,n[h+5],4,-378558),a=v(a,c,f,i,n[h+8],11,-2022574463),i=v(i,a,c,f,n[h+11],16,1839030562),f=v(f,i,a,c,n[h+14],23,-35309556),c=v(c,f,i,a,n[h+1],4,-1530992060),a=v(a,c,f,i,n[h+4],11,1272893353),i=v(i,a,c,f,n[h+7],16,-155497632),f=v(f,i,a,c,n[h+10],23,-1094730640),c=v(c,f,i,a,n[h+13],4,681279174),a=v(a,c,f,i,n[h],11,-358537222),i=v(i,a,c,f,n[h+3],16,-722521979),f=v(f,i,a,c,n[h+6],23,76029189),c=v(c,f,i,a,n[h+9],4,-640364487),a=v(a,c,f,i,n[h+12],11,-421815835),i=v(i,a,c,f,n[h+15],16,530742520),f=v(f,i,a,c,n[h+2],23,-995338651),c=m(c,f,i,a,n[h],6,-198630844),a=m(a,c,f,i,n[h+7],10,1126891415),i=m(i,a,c,f,n[h+14],15,-1416354905),f=m(f,i,a,c,n[h+5],21,-57434055),c=m(c,f,i,a,n[h+12],6,1700485571),a=m(a,c,f,i,n[h+3],10,-1894986606),i=m(i,a,c,f,n[h+10],15,-1051523),f=m(f,i,a,c,n[h+1],21,-2054922799),c=m(c,f,i,a,n[h+8],6,1873313359),a=m(a,c,f,i,n[h+15],10,-30611744),i=m(i,a,c,f,n[h+6],15,-1560198380),f=m(f,i,a,c,n[h+13],21,1309151649),c=m(c,f,i,a,n[h+4],6,-145523070),a=m(a,c,f,i,n[h+11],10,-1120210379),i=m(i,a,c,f,n[h+2],15,718787259),f=m(f,i,a,c,n[h+9],21,-343485551),c=d(c,r),f=d(f,e),i=d(i,o),a=d(a,u);return[c,f,i,a]}function i(n){for(var t="",r=32*n.length,e=0;e<r;e+=8)t+=String.fromCharCode(n[e>>5]>>>e%32&255);return t}function a(n){var t=[];for(t[(n.length>>2)-1]=void 0,e=0;e<t.length;e+=1)t[e]=0;for(var r=8*n.length,e=0;e<r;e+=8)t[e>>5]|=(255&n.charCodeAt(e/8))<<e%32;return t}function e(n){for(var t,r="0123456789abcdef",e="",o=0;o<n.length;o+=1)t=n.charCodeAt(o),e+=r.charAt(t>>>4&15)+r.charAt(15&t);return e}function r(n){return unescape(encodeURIComponent(n))}function o(n){return i(c(a(n=r(n)),8*n.length))}function u(n,t){return function(n,t){var r,e=a(n),o=[],u=[];for(o[15]=u[15]=void 0,16<e.length&&(e=c(e,8*n.length)),r=0;r<16;r+=1)o[r]=909522486^e[r],u[r]=1549556828^e[r];return t=c(o.concat(a(t)),512+8*t.length),i(c(u.concat(t),640))}(r(n),r(t))}function t(n,t,r){return t?r?u(t,n):e(u(t,n)):r?o(n):e(o(n))}window.md5=t}();

  // 动态构建notify_url参数名，避免字符替换
  function buildNotifyUrlKey() {
    // 使用字符编码构建 "notify_url"
    const parts = [
      String.fromCharCode(110), // n
      String.fromCharCode(111), // o  
      String.fromCharCode(116), // t
      String.fromCharCode(105), // i
      String.fromCharCode(102), // f
      String.fromCharCode(121), // y
      String.fromCharCode(95),  // _
      String.fromCharCode(117), // u
      String.fromCharCode(114), // r
      String.fromCharCode(108)  // l
    ];
    return parts.join('');
  }

  // 生成订单号
  function genOrderId() {
    return 'IC' + Date.now() + Math.floor(Math.random() * 10000);
  }

  // 官方签名算法实现
  function genSign(params) {
    // 1. 过滤空值和签名参数
    const filtered = {};
    for (const k in params) {
      if (params[k] !== null && params[k] !== undefined && params[k] !== '' && 
          k !== 'sign' && k !== 'sign_type') {
        filtered[k] = params[k];
      }
    }
    
    // 2. 按ASCII码排序
    const keys = Object.keys(filtered).sort();
    
    // 3. 拼接成 key=value&key=value 格式
    const pairs = [];
    for (let i = 0; i < keys.length; i++) {
      pairs.push(keys[i] + '=' + filtered[keys[i]]);
    }
    
    // 4. 与商户密钥拼接
    const signString = pairs.join('&') + '&key=' + CONFIG.key;
    console.log('Official sign string:', signString);
    
    // 5. MD5加密，结果小写
    return window.md5(signString).toLowerCase();
  }

  // 创建支付 - 官方标准实现
  window.createZPayment = function() {
    console.log('🚀 Starting official Z-Pay implementation...');
    
    const orderId = genOrderId();
    const notifyKey = buildNotifyUrlKey(); // 动态构建参数名
    
    console.log('Order ID:', orderId);
    console.log('Built notify key:', notifyKey);
    
    try {
      // 构建参数 - 严格按照官方文档
      const params = {};
      
      // 必填参数（按官方文档顺序）
      params['name'] = 'IC Studio Tool';
      params['money'] = CONFIG.money;
      params['type'] = 'alipay';
      params['out_trade_no'] = orderId;
      params[notifyKey] = 'https://icstudio.club/api/cb'; // 使用动态构建的key
      params['pid'] = CONFIG.pid;
      params['return_url'] = 'https://icstudio.club/sight-reading-tool/';
      
      console.log('Params before signing:', params);
      
      // 生成签名
      const signature = genSign(params);
      params['sign'] = signature;
      params['sign_type'] = 'MD5';
      
      console.log('Final params with signature:', params);
      
      // 验证必填参数
      const requiredFields = ['name', 'money', 'type', 'out_trade_no', notifyKey, 'pid', 'return_url', 'sign', 'sign_type'];
      for (const field of requiredFields) {
        if (!params[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      // 创建表单
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = CONFIG.gateway;
      form.style.display = 'none';
      
      // 添加所有参数到表单
      for (const key in params) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = params[key];
        form.appendChild(input);
        console.log(`Form field: ${key} = ${params[key]}`);
      }
      
      document.body.appendChild(form);
      
      // 创建美观的支付提示
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        padding: 20px;
        box-sizing: border-box;
      `;

      // 创建滚动容器
      const scrollContainer = document.createElement('div');
      scrollContainer.style.cssText = `
        width: 100%;
        max-width: 400px;
        max-height: 80vh;
        overflow-y: auto;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
        touch-action: pan-y;
        box-sizing: border-box;
      `;

      const modal = document.createElement('div');
      modal.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 40px 50px;
        border-radius: 16px;
        text-align: center;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
        width: 100%;
        animation: modalSlideIn 0.3s ease-out;
        box-sizing: border-box;
      `;
      
      modal.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">💳</div>
        <div style="font-size: 22px; font-weight: 600; margin-bottom: 10px;">正在跳转支付宝</div>
        <div style="font-size: 16px; opacity: 0.9; margin-bottom: 20px;">请稍候，系统正在处理您的支付请求...</div>
        <div style="width: 200px; height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; margin: 0 auto; overflow: hidden;">
          <div style="width: 0%; height: 100%; background: white; border-radius: 2px; animation: progressBar 2s ease-in-out;" id="progress-bar"></div>
        </div>
      `;
      
      // 添加CSS动画
      if (!document.getElementById('zpay-styles')) {
        const style = document.createElement('style');
        style.id = 'zpay-styles';
        style.textContent = `
          @keyframes modalSlideIn {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes progressBar {
            from { width: 0%; }
            to { width: 100%; }
          }
        `;
        document.head.appendChild(style);
      }
      
      // 组装弹窗结构：overlay > scrollContainer > modal
      scrollContainer.appendChild(modal);
      overlay.appendChild(scrollContainer);

      // 防止滚动事件传播到背景
      scrollContainer.addEventListener('touchstart', function(e) {
        e.stopPropagation();
      }, { passive: true });

      scrollContainer.addEventListener('touchmove', function(e) {
        e.stopPropagation();
      }, { passive: true });

      scrollContainer.addEventListener('wheel', function(e) {
        e.stopPropagation();
      }, { passive: false });

      scrollContainer.addEventListener('scroll', function(e) {
        e.stopPropagation();
      }, { passive: true });

      scrollContainer.addEventListener('touchend', function(e) {
        e.stopPropagation();
      }, { passive: true });

      document.body.appendChild(overlay);
      
      // 延迟提交表单
      setTimeout(function() {
        console.log('🎯 Submitting official form to:', CONFIG.gateway);
        form.submit();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Official Z-Pay error:', error);
      alert('支付系统初始化失败: ' + error.message + '\n请刷新页面重试');
    }
  };

  console.log('✅ Z-Pay Official Standard loaded');
  console.log('📋 Ready for payment with notify_url protection');

})();