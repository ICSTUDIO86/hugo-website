/**
 * Z-Pay 编码版本 - 使用URL编码避免字符替换问题
 */

(function() {
  'use strict';

  // 配置
  const CONFIG = {
    gateway: 'https://zpayz.cn/submit.php',
    pid: '2025090607243839', 
    key: 'UoA5vDBCe51EyVzdK2Fu2udBO1SAadjN',
    money: '248.00'
  };

  // MD5 (压缩版)
  !function(n){"use strict";function d(n,t){var r=(65535&n)+(65535&t);return(n>>16)+(t>>16)+(r>>16)<<16|65535&r}function f(n,t,r,e,o,u){return d((u=d(d(t,n),d(e,u)))<<o|u>>>32-o,r)}function l(n,t,r,e,o,u,c){return f(t&r|~t&e,n,t,o,u,c)}function g(n,t,r,e,o,u,c){return f(t&e|r&~e,n,t,o,u,c)}function v(n,t,r,e,o,u,c){return f(t^r^e,n,t,o,u,c)}function m(n,t,r,e,o,u,c){return f(r^(t|~e),n,t,o,u,c)}function c(n,t){var r,e,o,u;n[t>>5]|=128<<t%32,n[14+(t+64>>>9<<4)]=t;for(var c=1732584193,f=-271733879,i=-1732584194,a=271733878,h=0;h<n.length;h+=16)c=l(r=c,e=f,o=i,u=a,n[h],7,-680876936),a=l(a,c,f,i,n[h+1],12,-389564586),i=l(i,a,c,f,n[h+2],17,606105819),f=l(f,i,a,c,n[h+3],22,-1044525330),c=l(c,f,i,a,n[h+4],7,-176418897),a=l(a,c,f,i,n[h+5],12,1200080426),i=l(i,a,c,f,n[h+6],17,-1473231341),f=l(f,i,a,c,n[h+7],22,-45705983),c=l(c,f,i,a,n[h+8],7,1770035416),a=l(a,c,f,i,n[h+9],12,-1958414417),i=l(i,a,c,f,n[h+10],17,-42063),f=l(f,i,a,c,n[h+11],22,-1990404162),c=l(c,f,i,a,n[h+12],7,1804603682),a=l(a,c,f,i,n[h+13],12,-40341101),i=l(i,a,c,f,n[h+14],17,-1502002290),f=l(f,i,a,c,n[h+15],22,1236535329),c=g(c,f,i,a,n[h+1],5,-165796510),a=g(a,c,f,i,n[h+6],9,-1069501632),i=g(i,a,c,f,n[h+11],14,643717713),f=g(f,i,a,c,n[h],20,-373897302),c=g(c,f,i,a,n[h+5],5,-701558691),a=g(a,c,f,i,n[h+10],9,38016083),i=g(i,a,c,f,n[h+15],14,-660478335),f=g(f,i,a,c,n[h+4],20,-405537848),c=g(c,f,i,a,n[h+9],5,568446438),a=g(a,c,f,i,n[h+14],9,-1019803690),i=g(i,a,c,f,n[h+3],14,-187363961),f=g(f,i,a,c,n[h+8],20,1163531501),c=g(c,f,i,a,n[h+13],5,-1444681467),a=g(a,c,f,i,n[h+2],9,-51403784),i=g(i,a,c,f,n[h+7],14,1735328473),f=g(f,i,a,c,n[h+12],20,-1926607734),c=v(c,f,i,a,n[h+5],4,-378558),a=v(a,c,f,i,n[h+8],11,-2022574463),i=v(i,a,c,f,n[h+11],16,1839030562),f=v(f,i,a,c,n[h+14],23,-35309556),c=v(c,f,i,a,n[h+1],4,-1530992060),a=v(a,c,f,i,n[h+4],11,1272893353),i=v(i,a,c,f,n[h+7],16,-155497632),f=v(f,i,a,c,n[h+10],23,-1094730640),c=v(c,f,i,a,n[h+13],4,681279174),a=v(a,c,f,i,n[h],11,-358537222),i=v(i,a,c,f,n[h+3],16,-722521979),f=v(f,i,a,c,n[h+6],23,76029189),c=v(c,f,i,a,n[h+9],4,-640364487),a=v(a,c,f,i,n[h+12],11,-421815835),i=v(i,a,c,f,n[h+15],16,530742520),f=v(f,i,a,c,n[h+2],23,-995338651),c=m(c,f,i,a,n[h],6,-198630844),a=m(a,c,f,i,n[h+7],10,1126891415),i=m(i,a,c,f,n[h+14],15,-1416354905),f=m(f,i,a,c,n[h+5],21,-57434055),c=m(c,f,i,a,n[h+12],6,1700485571),a=m(a,c,f,i,n[h+3],10,-1894986606),i=m(i,a,c,f,n[h+10],15,-1051523),f=m(f,i,a,c,n[h+1],21,-2054922799),c=m(c,f,i,a,n[h+8],6,1873313359),a=m(a,c,f,i,n[h+15],10,-30611744),i=m(i,a,c,f,n[h+6],15,-1560198380),f=m(f,i,a,c,n[h+13],21,1309151649),c=m(c,f,i,a,n[h+4],6,-145523070),a=m(a,c,f,i,n[h+11],10,-1120210379),i=m(i,a,c,f,n[h+2],15,718787259),f=m(f,i,a,c,n[h+9],21,-343485551),c=d(c,r),f=d(f,e),i=d(i,o),a=d(a,u);return[c,f,i,a]}function i(n){for(var t="",r=32*n.length,e=0;e<r;e+=8)t+=String.fromCharCode(n[e>>5]>>>e%32&255);return t}function a(n){var t=[];for(t[(n.length>>2)-1]=void 0,e=0;e<t.length;e+=1)t[e]=0;for(var r=8*n.length,e=0;e<r;e+=8)t[e>>5]|=(255&n.charCodeAt(e/8))<<e%32;return t}function e(n){for(var t,r="0123456789abcdef",e="",o=0;o<n.length;o+=1)t=n.charCodeAt(o),e+=r.charAt(t>>>4&15)+r.charAt(15&t);return e}function r(n){return unescape(encodeURIComponent(n))}function o(n){return i(c(a(n=r(n)),8*n.length))}function u(n,t){return function(n,t){var r,e=a(n),o=[],u=[];for(o[15]=u[15]=void 0,16<e.length&&(e=c(e,8*n.length)),r=0;r<16;r+=1)o[r]=909522486^e[r],u[r]=1549556828^e[r];return t=c(o.concat(a(t)),512+8*t.length),i(c(u.concat(t),640))}(r(n),r(t))}function t(n,t,r){return t?r?u(t,n):e(u(t,n)):r?o(n):e(o(n))}window.md5=t}();

  // 生成订单号
  function genOrderId() {
    return 'IC' + Date.now() + Math.floor(Math.random() * 10000);
  }

  // 生成签名 - 特别处理编码问题
  function genSign(params) {
    const filtered = {};
    for (const k in params) {
      if (params[k] !== null && params[k] !== undefined && params[k] !== '' && k !== 'sign' && k !== 'sign_type') {
        // 对于特殊参数，使用原始值而不是编码值进行签名
        if (k === 'callback_url') {
          // 在签名时使用解码后的原始参数名
          const originalKey = decodeURIComponent(k.replace('callback_url', 'notify_url'));
          filtered[originalKey] = params[k];
        } else {
          filtered[k] = params[k];
        }
      }
    }
    
    const keys = Object.keys(filtered).sort();
    const arr = [];
    
    for (let i = 0; i < keys.length; i++) {
      arr.push(keys[i] + '=' + filtered[keys[i]]);
    }
    
    const str = arr.join('&') + '&key=' + CONFIG.key;
    console.log('Encoded sign string:', str);
    
    return window.md5(str);
  }

  // 创建支付 - 使用编码技术避免字符替换
  window.createZPayment = function() {
    const orderId = genOrderId();
    console.log('Order ID (encoded):', orderId);
    
    try {
      // 创建参数对象，使用不同的策略避免字符替换
      const params = {};
      
      // 标准参数
      params['pid'] = CONFIG.pid;
      params['type'] = 'alipay';
      params['out_trade_no'] = orderId;
      params['return_url'] = `${window.location.origin}/sight-reading-tool/`;
      params['name'] = 'IC Studio Tool';
      params['money'] = CONFIG.money;
      
      // 使用替代方案1：使用callback_url作为表单参数名
      // 但在签名时仍使用notify_url
      params['callback_url'] = 'https://icstudio.club/api/cb';
      
      // 生成签名时，临时创建正确的参数集
      const signParams = {
        'pid': CONFIG.pid,
        'type': 'alipay',
        'out_trade_no': orderId,
        'return_url': `${window.location.origin}/sight-reading-tool/`,
        'name': 'IC Studio Tool',
        'money': CONFIG.money,
        'notify_url': 'https://icstudio.club/api/cb'  // 签名时使用正确的参数名
      };
      
      const signature = genSign(signParams);
      params['sign'] = signature;
      params['sign_type'] = 'MD5';
      
      console.log('Encoded params:', params);
      
      // 创建表单时，动态修改参数名
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = CONFIG.gateway;
      form.style.display = 'none';
      
      for (const key in params) {
        const input = document.createElement('input');
        input.type = 'hidden';
        
        // 在提交表单时，将callback_url改回notify_url
        if (key === 'callback_url') {
          input.name = 'notify_url';
        } else {
          input.name = key;
        }
        
        input.value = params[key];
        form.appendChild(input);
      }
      
      document.body.appendChild(form);
      
      // 添加提示信息
      const msg = document.createElement('div');
      msg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:25px 40px;border-radius:12px;font-size:16px;z-index:99999;box-shadow:0 15px 35px rgba(0,0,0,0.2);text-align:center;';
      msg.innerHTML = '<div style="font-size:24px;margin-bottom:10px;">💳</div><div style="font-weight:600;">正在跳转到支付宝</div><div style="font-size:14px;margin-top:8px;opacity:0.9;">请稍候...</div>';
      document.body.appendChild(msg);
      
      // 延迟提交以显示提示信息
      setTimeout(function() {
        console.log('Submitting encoded form with notify_url correction...');
        form.submit();
      }, 1000);
      
    } catch (error) {
      console.error('Payment initialization error:', error);
      alert('支付系统初始化失败，请刷新页面重试');
    }
  };

  console.log('Z-Pay Encoded Version loaded');
})();
