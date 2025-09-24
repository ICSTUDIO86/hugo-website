/**
 * Z-Pay 最简版本 - 不使用notify_url参数
 * 根据易支付文档，notify_url不是绝对必需的
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

  // 简化的MD5
  function simpleMD5(str) {
    function rotateLeft(value, amount) {
      var lbits = (value << amount) | (value >>> (32 - amount));
      return lbits;
    }
    
    function addUnsigned(x, y) {
      var x4 = (x & 0x40000000);
      var y4 = (y & 0x40000000);
      var x8 = (x & 0x80000000);
      var y8 = (y & 0x80000000);
      var result = (x & 0x3FFFFFFF) + (y & 0x3FFFFFFF);
      if (x4 & y4) {
        return (result ^ 0x80000000 ^ x8 ^ y8);
      }
      if (x4 | y4) {
        if (result & 0x40000000) {
          return (result ^ 0xC0000000 ^ x8 ^ y8);
        } else {
          return (result ^ 0x40000000 ^ x8 ^ y8);
        }
      } else {
        return (result ^ x8 ^ y8);
      }
    }
    
    function F(x, y, z) { return (x & y) | ((~x) & z); }
    function G(x, y, z) { return (x & z) | (y & (~z)); }
    function H(x, y, z) { return (x ^ y ^ z); }
    function I(x, y, z) { return (y ^ (x | (~z))); }
    
    function FF(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    
    function GG(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    
    function HH(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    
    function II(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    
    function convertToWordArray(str) {
      var wordArray = [];
      var messageLength = str.length;
      var numberOfWords = (((messageLength + 8) - ((messageLength + 8) % 64)) / 64 + 1) * 16;
      for (var i = 0; i < numberOfWords; i++) wordArray[i] = 0;
      var byteCount = 0;
      while (byteCount < messageLength) {
        var wordCount = (byteCount - (byteCount % 4)) / 4;
        var bytePosition = (byteCount % 4) * 8;
        wordArray[wordCount] |= (str.charCodeAt(byteCount) << bytePosition);
        byteCount++;
      }
      wordCount = (byteCount - (byteCount % 4)) / 4;
      bytePosition = (byteCount % 4) * 8;
      wordArray[wordCount] |= (0x80 << bytePosition);
      wordArray[numberOfWords - 2] = messageLength << 3;
      wordArray[numberOfWords - 1] = messageLength >>> 29;
      return wordArray;
    }
    
    function wordToHex(value) {
      var hex = "", byte;
      for (var i = 0; i <= 3; i++) {
        byte = (value >>> (i * 8)) & 255;
        hex += ("0" + byte.toString(16)).slice(-2);
      }
      return hex;
    }
    
    var wordArray = convertToWordArray(str);
    var h = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476];
    
    for (var i = 0; i < wordArray.length; i += 16) {
      var aa = h[0], bb = h[1], cc = h[2], dd = h[3];
      
      h[0] = FF(h[0], h[1], h[2], h[3], wordArray[i + 0], 7, 0xD76AA478);
      h[3] = FF(h[3], h[0], h[1], h[2], wordArray[i + 1], 12, 0xE8C7B756);
      h[2] = FF(h[2], h[3], h[0], h[1], wordArray[i + 2], 17, 0x242070DB);
      h[1] = FF(h[1], h[2], h[3], h[0], wordArray[i + 3], 22, 0xC1BDCEEE);
      h[0] = FF(h[0], h[1], h[2], h[3], wordArray[i + 4], 7, 0xF57C0FAF);
      h[3] = FF(h[3], h[0], h[1], h[2], wordArray[i + 5], 12, 0x4787C62A);
      h[2] = FF(h[2], h[3], h[0], h[1], wordArray[i + 6], 17, 0xA8304613);
      h[1] = FF(h[1], h[2], h[3], h[0], wordArray[i + 7], 22, 0xFD469501);
      h[0] = FF(h[0], h[1], h[2], h[3], wordArray[i + 8], 7, 0x698098D8);
      h[3] = FF(h[3], h[0], h[1], h[2], wordArray[i + 9], 12, 0x8B44F7AF);
      h[2] = FF(h[2], h[3], h[0], h[1], wordArray[i + 10], 17, 0xFFFF5BB1);
      h[1] = FF(h[1], h[2], h[3], h[0], wordArray[i + 11], 22, 0x895CD7BE);
      h[0] = FF(h[0], h[1], h[2], h[3], wordArray[i + 12], 7, 0x6B901122);
      h[3] = FF(h[3], h[0], h[1], h[2], wordArray[i + 13], 12, 0xFD987193);
      h[2] = FF(h[2], h[3], h[0], h[1], wordArray[i + 14], 17, 0xA679438E);
      h[1] = FF(h[1], h[2], h[3], h[0], wordArray[i + 15], 22, 0x49B40821);
      
      h[0] = GG(h[0], h[1], h[2], h[3], wordArray[i + 1], 5, 0xF61E2562);
      h[3] = GG(h[3], h[0], h[1], h[2], wordArray[i + 6], 9, 0xC040B340);
      h[2] = GG(h[2], h[3], h[0], h[1], wordArray[i + 11], 14, 0x265E5A51);
      h[1] = GG(h[1], h[2], h[3], h[0], wordArray[i + 0], 20, 0xE9B6C7AA);
      h[0] = GG(h[0], h[1], h[2], h[3], wordArray[i + 5], 5, 0xD62F105D);
      h[3] = GG(h[3], h[0], h[1], h[2], wordArray[i + 10], 9, 0x02441453);
      h[2] = GG(h[2], h[3], h[0], h[1], wordArray[i + 15], 14, 0xD8A1E681);
      h[1] = GG(h[1], h[2], h[3], h[0], wordArray[i + 4], 20, 0xE7D3FBC8);
      h[0] = GG(h[0], h[1], h[2], h[3], wordArray[i + 9], 5, 0x21E1CDE6);
      h[3] = GG(h[3], h[0], h[1], h[2], wordArray[i + 14], 9, 0xC33707D6);
      h[2] = GG(h[2], h[3], h[0], h[1], wordArray[i + 3], 14, 0xF4D50D87);
      h[1] = GG(h[1], h[2], h[3], h[0], wordArray[i + 8], 20, 0x455A14ED);
      h[0] = GG(h[0], h[1], h[2], h[3], wordArray[i + 13], 5, 0xA9E3E905);
      h[3] = GG(h[3], h[0], h[1], h[2], wordArray[i + 2], 9, 0xFCEFA3F8);
      h[2] = GG(h[2], h[3], h[0], h[1], wordArray[i + 7], 14, 0x676F02D9);
      h[1] = GG(h[1], h[2], h[3], h[0], wordArray[i + 12], 20, 0x8D2A4C8A);
      
      h[0] = HH(h[0], h[1], h[2], h[3], wordArray[i + 5], 4, 0xFFFA3942);
      h[3] = HH(h[3], h[0], h[1], h[2], wordArray[i + 8], 11, 0x8771F681);
      h[2] = HH(h[2], h[3], h[0], h[1], wordArray[i + 11], 16, 0x6D9D6122);
      h[1] = HH(h[1], h[2], h[3], h[0], wordArray[i + 14], 23, 0xFDE5380C);
      h[0] = HH(h[0], h[1], h[2], h[3], wordArray[i + 1], 4, 0xA4BEEA44);
      h[3] = HH(h[3], h[0], h[1], h[2], wordArray[i + 4], 11, 0x4BDECFA9);
      h[2] = HH(h[2], h[3], h[0], h[1], wordArray[i + 7], 16, 0xF6BB4B60);
      h[1] = HH(h[1], h[2], h[3], h[0], wordArray[i + 10], 23, 0xBEBFBC70);
      h[0] = HH(h[0], h[1], h[2], h[3], wordArray[i + 13], 4, 0x289B7EC6);
      h[3] = HH(h[3], h[0], h[1], h[2], wordArray[i + 0], 11, 0xEAA127FA);
      h[2] = HH(h[2], h[3], h[0], h[1], wordArray[i + 3], 16, 0xD4EF3085);
      h[1] = HH(h[1], h[2], h[3], h[0], wordArray[i + 6], 23, 0x04881D05);
      h[0] = HH(h[0], h[1], h[2], h[3], wordArray[i + 9], 4, 0xD9D4D039);
      h[3] = HH(h[3], h[0], h[1], h[2], wordArray[i + 12], 11, 0xE6DB99E5);
      h[2] = HH(h[2], h[3], h[0], h[1], wordArray[i + 15], 16, 0x1FA27CF8);
      h[1] = HH(h[1], h[2], h[3], h[0], wordArray[i + 2], 23, 0xC4AC5665);
      
      h[0] = II(h[0], h[1], h[2], h[3], wordArray[i + 0], 6, 0xF4292244);
      h[3] = II(h[3], h[0], h[1], h[2], wordArray[i + 7], 10, 0x432AFF97);
      h[2] = II(h[2], h[3], h[0], h[1], wordArray[i + 14], 15, 0xAB9423A7);
      h[1] = II(h[1], h[2], h[3], h[0], wordArray[i + 5], 21, 0xFC93A039);
      h[0] = II(h[0], h[1], h[2], h[3], wordArray[i + 12], 6, 0x655B59C3);
      h[3] = II(h[3], h[0], h[1], h[2], wordArray[i + 3], 10, 0x8F0CCC92);
      h[2] = II(h[2], h[3], h[0], h[1], wordArray[i + 10], 15, 0xFFEFF47D);
      h[1] = II(h[1], h[2], h[3], h[0], wordArray[i + 1], 21, 0x85845DD1);
      h[0] = II(h[0], h[1], h[2], h[3], wordArray[i + 8], 6, 0x6FA87E4F);
      h[3] = II(h[3], h[0], h[1], h[2], wordArray[i + 15], 10, 0xFE2CE6E0);
      h[2] = II(h[2], h[3], h[0], h[1], wordArray[i + 6], 15, 0xA3014314);
      h[1] = II(h[1], h[2], h[3], h[0], wordArray[i + 13], 21, 0x4E0811A1);
      h[0] = II(h[0], h[1], h[2], h[3], wordArray[i + 4], 6, 0xF7537E82);
      h[3] = II(h[3], h[0], h[1], h[2], wordArray[i + 11], 10, 0xBD3AF235);
      h[2] = II(h[2], h[3], h[0], h[1], wordArray[i + 2], 15, 0x2AD7D2BB);
      h[1] = II(h[1], h[2], h[3], h[0], wordArray[i + 9], 21, 0xEB86D391);
      
      h[0] = addUnsigned(h[0], aa);
      h[1] = addUnsigned(h[1], bb);
      h[2] = addUnsigned(h[2], cc);
      h[3] = addUnsigned(h[3], dd);
    }
    
    return (wordToHex(h[0]) + wordToHex(h[1]) + wordToHex(h[2]) + wordToHex(h[3])).toLowerCase();
  }

  // 生成订单号
  function genOrderId() {
    return 'IC' + Date.now() + Math.floor(Math.random() * 10000);
  }

  // 生成签名
  function genSign(params) {
    const filtered = {};
    for (const k in params) {
      if (params[k] && k !== 'sign' && k !== 'sign_type') {
        filtered[k] = params[k];
      }
    }
    
    const keys = Object.keys(filtered).sort();
    const arr = [];
    
    for (let i = 0; i < keys.length; i++) {
      arr.push(keys[i] + '=' + filtered[keys[i]]);
    }
    
    const str = arr.join('&') + '&key=' + CONFIG.key;
    console.log('Sign string (minimal):', str);
    
    return simpleMD5(str);
  }

  // 创建支付 - 最简版本，不使用notify_url
  window.createZPayment = function() {
    const orderId = genOrderId();
    console.log('Order ID (minimal):', orderId);
    
    // 最简参数，完全不使用notify_url
    const params = {
      'pid': CONFIG.pid,
      'type': 'alipay', 
      'out_trade_no': orderId,
      'return_url': `${window.location.origin}/sight-reading-tool/`,
      'name': 'IC Studio Tool',
      'money': CONFIG.money
    };
    
    // 生成签名
    params['sign'] = genSign(params);
    params['sign_type'] = 'MD5';
    
    console.log('Minimal Params:', params);
    
    // 创建表单
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = CONFIG.gateway;
    form.style.display = 'none';
    
    for (const key in params) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = params[key];
      form.appendChild(input);
    }
    
    document.body.appendChild(form);
    
    // 提示
    const msg = document.createElement('div');
    msg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#667eea;color:white;padding:20px 40px;border-radius:10px;font-size:16px;z-index:99999;box-shadow:0 10px 30px rgba(0,0,0,0.3)';
    msg.innerHTML = '<div style="margin-bottom:10px">🚀</div><div>正在跳转到支付宝...</div>';
    document.body.appendChild(msg);
    
    setTimeout(function() {
      console.log('Submitting minimal form...');
      form.submit();
    }, 1500);
  };

  console.log('Z-Pay Minimal Version loaded (no notify_url)');
})();