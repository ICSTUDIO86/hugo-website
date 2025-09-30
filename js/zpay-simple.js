/**
 * Z-Pay 简化页面跳转支付实现
 * 流程：前端 → 云函数签名 → 表单提交 → 页面跳转支付 → 回调处理
 */

(function() {
  'use strict';

  // 云函数配置 - 实际HTTP访问地址
  const API_ENDPOINTS = {
    createPayment: 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/createPayment',
    checkOrder: 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/checkOrder'
  };

  // 如果你还没有部署云函数，请先完成以下步骤：
  // 1. 在CloudBase控制台创建云函数
  // 2. 配置环境变量：TCB_ENV, ZPAY_PID, ZPAY_KEY, ZPAY_NOTIFY_URL  
  // 3. 更新这里的URL为实际的云函数HTTP访问地址

  // 显示加载状态
  function showLoading(message) {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'zpay-loading';
    loadingDiv.style.cssText = `
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
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 40px;
      border-radius: 12px;
      text-align: center;
      max-width: 300px;
    `;

    content.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 20px; animation: spin 2s linear infinite;">⏳</div>
      <h3 style="margin: 0 0 10px 0; color: #333;">${message}</h3>
      <p style="margin: 0; color: #666; font-size: 14px;">请稍候...</p>
    `;

    // 添加旋转动画
    if (!document.getElementById('zpay-loading-styles')) {
      const style = document.createElement('style');
      style.id = 'zpay-loading-styles';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    loadingDiv.appendChild(content);
    document.body.appendChild(loadingDiv);
    
    return loadingDiv;
  }

  // 隐藏加载状态
  function hideLoading() {
    const loading = document.getElementById('zpay-loading');
    if (loading) loading.remove();
  }

  // 显示访问码
  function showAccessCode(accessCode, orderInfo) {
    hideLoading();
    
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      max-width: 400px;
      width: 90%;
      position: relative;
    `;

    content.innerHTML = `
      <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
      <h2 style="margin: 0 0 15px 0;">支付成功！</h2>
      <p style="margin: 0 0 20px 0; opacity: 0.9;">感谢您的购买</p>
      
      <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0;">您的访问码</h3>
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
          <div style="flex: 1; font-family: monospace; font-size: 20px; font-weight: bold; letter-spacing: 2px; background: rgba(255,255,255,0.2); padding: 12px; border-radius: 6px; word-break: break-all;">
            ${accessCode}
          </div>
          <button onclick="copyToClipboard('${accessCode}')" 
                  style="background: rgba(255,255,255,0.3); color: white; border: 1px solid rgba(255,255,255,0.4); padding: 12px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s ease; white-space: nowrap;"
                  onmouseover="this.style.background='rgba(255,255,255,0.4)'"
                  onmouseout="this.style.background='rgba(255,255,255,0.3)'"
                  title="复制访问码">
            📋
          </button>
        </div>
        <p style="margin: 0; font-size: 12px; opacity: 0.8;">请保存好此访问码</p>
      </div>

      <div style="font-size: 14px; opacity: 0.8; margin: 20px 0;">
        <p>订单号: ${orderInfo?.out_trade_no || ''}</p>
        <p>金额: ¥${orderInfo?.money || ''}</p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px; margin: 25px 0;">
        <button onclick="window.downloadApp()" style="
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
          border: none;
          padding: 14px 30px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(40, 167, 69, 0.4)'" 
           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(40, 167, 69, 0.3)'">
          📦 下载应用
        </button>
        
        <button onclick="window.startUsing('${accessCode}')" style="
          background: linear-gradient(135deg, #ffc107 0%, #ff8f00 100%);
          color: white;
          border: none;
          padding: 14px 30px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(255, 193, 7, 0.3);
        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(255, 193, 7, 0.4)'" 
           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(255, 193, 7, 0.3)'">
          开始使用
        </button>
      </div>

      <button onclick="this.parentElement.parentElement.remove()" style="
        background: rgba(255,255,255,0.2);
        color: white;
        border: 1px solid rgba(255,255,255,0.3);
        padding: 10px 30px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
        关闭
      </button>
    `;

    // 组装弹窗结构：modal > scrollContainer > content
    scrollContainer.appendChild(content);
    modal.appendChild(scrollContainer);

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

    document.body.appendChild(modal);
  }

  // 显示支付界面
  function showPaymentInterface(paymentData) {
    hideLoading();

    const modal = document.createElement('div');
    modal.id = 'zpay-payment-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
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
      max-width: 420px;
      max-height: 80vh;
      overflow-y: auto !important;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
      touch-action: pan-y;
      box-sizing: border-box;
      scrollbar-width: thin;
      scrollbar-color: #1677FF rgba(0, 0, 0, 0.05);
    `;

    // 为当前滚动容器添加类名以便样式定位
    scrollContainer.className = 'alipay-payment-scroll';

    if (!document.getElementById('alipay-payment-scrollbar-styles')) {
      const style = document.createElement('style');
      style.id = 'alipay-payment-scrollbar-styles';
      style.textContent = `
        .alipay-payment-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .alipay-payment-scroll::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 3px;
        }

        .alipay-payment-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #1677FF 0%, #0E5CE6 100%);
          border-radius: 3px;
          transition: all 0.3s ease;
        }

        .alipay-payment-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #0E5CE6 0%, #0A47C7 100%);
          box-shadow: 0 2px 4px rgba(22, 119, 255, 0.3);
        }

        .alipay-payment-scroll::-webkit-scrollbar-thumb:active {
          background: linear-gradient(135deg, #0A47C7 0%, #0638A8 100%);
        }
      `;
      document.head.appendChild(style);
    }

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 0;
      border-radius: 12px;
      text-align: center;
      width: 100%;
      position: relative;
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15);
      min-height: 400px;
    `;

    let paymentContent = `
      <!-- 支付宝风格顶部蓝色区域 -->
      <div style="background: linear-gradient(135deg, #1677FF 0%, #0E5CE6 100%); padding: 24px 30px; color: white; position: relative;">
        <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
          <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div>
            <h3 style="color: white; margin: 0; font-size: 18px; font-weight: 600;">确认支付</h3>
          </div>
        </div>
        <div style="background: rgba(255,255,255,0.1); padding: 12px 16px; border-radius: 8px; margin-top: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="color: rgba(255,255,255,0.8); font-size: 14px;">商品</span>
            <span style="color: white; font-size: 14px; font-weight: 500;">IC Studio 视奏工具</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="color: rgba(255,255,255,0.8); font-size: 14px;">订单号</span>
            <span style="color: white; font-size: 12px; font-family: monospace;">${paymentData.out_trade_no}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: rgba(255,255,255,0.8); font-size: 14px;">金额</span>
            <span style="color: white; font-size: 20px; font-weight: 600;">¥${paymentData.order_info?.money || '1.00'}</span>
          </div>
        </div>
      </div>
      
      <!-- 主要内容区域 -->
      <div style="padding: 24px 30px;">
        <!-- 使用条款确认 - 支付宝风格 -->
        <div id="payment-terms-section" style="margin-bottom: 24px; padding: 16px; background: #F5F9FF; border-radius: 8px; border: 1px solid #E6F0FF; text-align: left;">
          <label style="display: flex; align-items: flex-start; cursor: pointer; font-size: 14px; color: #333;">
            <input type="checkbox" id="payment-terms-checkbox" onchange="togglePaymentQRCode()" style="margin-right: 12px; margin-top: 2px; transform: scale(1.3); accent-color: #1677FF;">
            <span>我已阅读并同意 <a href="#" onclick="showPaymentTermsDialog()" style="color: #1677FF; text-decoration: none; font-weight: 500;">《用户协议》</a> 和 <a href="#" onclick="showPaymentPrivacyDialog()" style="color: #1677FF; text-decoration: none; font-weight: 500;">《隐私政策》</a></span>
          </label>
        </div>
        
        <!-- 支付二维码区域（初始隐藏） -->
        <div id="payment-qrcode-section" style="display: none;">
    `;

    // 根据API返回的支付方式显示不同内容
    if (paymentData.img) {
      // 有二维码图片，直接显示（支付宝风格）
      paymentContent += `
        <div style="background: #F8FBFF; border-radius: 12px; padding: 24px; margin-bottom: 20px; border: 1px solid #E1EDFF;">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <div style="width: 24px; height: 24px; background: #1677FF; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 8px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M3,11H5V13H3V11M11,5H13V9H11V5M9,11H13V15H11V13H9V11M15,5H19V9H17V7H15V5M19,13V15H17V11H19V13M21,21H3V19H21V21Z"/>
              </svg>
            </div>
            <span style="color: #1677FF; font-weight: 600; font-size: 16px;">扫码支付</span>
          </div>
          <div style="display: flex; justify-content: center; margin-bottom: 16px;">
            <div style="padding: 12px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <img src="${paymentData.img}" alt="支付二维码" style="width: 180px; height: 180px; display: block; border-radius: 4px;">
            </div>
          </div>
          <div style="text-align: center;">
            <p style="color: #1677FF; font-size: 14px; margin: 0 0 4px 0; font-weight: 500;">请使用支付宝扫描二维码</p>
            <p style="color: #666; font-size: 12px; margin: 0;">扫码后确认支付即可获得访问码</p>
          </div>
        </div>
      `;
    } else if (paymentData.payurl) {
      // 有支付链接，提供按钮跳转（支付宝风格）
      paymentContent += `
        <div style="background: #F8FBFF; border-radius: 12px; padding: 24px; margin-bottom: 20px; border: 1px solid #E1EDFF; text-align: center;">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #1677FF 0%, #0E5CE6 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M20,8H4V6H20M20,18H4V12H20M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z"/>
              </svg>
            </div>
          </div>
          <h4 style="color: #1677FF; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">支付宝支付</h4>
          <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">点击下方按钮跳转到支付宝完成支付</p>
          <button onclick="window.open('${paymentData.payurl}', '_blank')" style="
            background: linear-gradient(135deg, #1677FF 0%, #0E5CE6 100%);
            color: white;
            padding: 14px 32px;
            border: none;
            border-radius: 25px;
            font-weight: 600;
            font-size: 16px;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(22, 119, 255, 0.3);
            transition: all 0.3s ease;
            width: 100%;
            max-width: 200px;
          " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(22, 119, 255, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 16px rgba(22, 119, 255, 0.3)'">
            立即支付
          </button>
          <p style="color: #999; font-size: 12px; margin: 12px 0 0 0;">支付完成后页面将自动更新</p>
        </div>
      `;
    } else if (paymentData.qrcode) {
      // 有二维码链接但无图片（居中对齐）
      paymentContent += `
        <div style="margin: 20px 0; padding: 20px; border: 2px dashed #ddd; border-radius: 8px; display: flex; flex-direction: column; align-items: center;">
          <p style="margin: 0 0 15px 0; color: #666; text-align: center;">扫码支付</p>
          <button onclick="window.open('${paymentData.qrcode}', '_blank')" style="
            background: #f0f0f0;
            color: #333;
            padding: 10px 20px;
            border: 1px solid #ddd;
            border-radius: 6px;
            cursor: pointer;
          ">打开二维码</button>
        </div>
      `;
    } else {
      // fallback - 直接显示支付链接（居中对齐）
      paymentContent += `
        <div style="margin: 20px 0; display: flex; flex-direction: column; align-items: center;">
          <p style="color: #f56565; margin-bottom: 15px; text-align: center;">⚠️ 未获取到支付二维码</p>
          <p style="color: #666; font-size: 14px; text-align: center;">请联系客服处理</p>
        </div>
      `;
    }

    // 支付状态显示区域（支付宝风格）
    paymentContent += `
        <div id="payment-status" style="margin-top: 16px; padding: 16px; background: #F0F7FF; border-radius: 8px; text-align: center; border: 1px solid #D1E9FF;">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
            <div id="status-icon" style="font-size: 18px; margin-right: 8px;">🔍</div>
            <div id="status-text" style="color: #1677FF; font-size: 14px; font-weight: 500;">正在检测支付状态...</div>
          </div>
        </div>
      </div>
    `;

    // 关闭按钮 - 支付宝风格
    paymentContent += `
      <button onclick="window.closePaymentModal()" style="
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(255,255,255,0.9);
        border: none;
        font-size: 16px;
        color: rgba(255,255,255,0.8);
        cursor: pointer;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      " onmouseover="this.style.background='rgba(255,255,255,1)'; this.style.color='#999'" onmouseout="this.style.background='rgba(255,255,255,0.9)'; this.style.color='rgba(255,255,255,0.8)'">×</button>
    `;

    content.innerHTML = paymentContent;

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

    // 组装弹窗结构：modal(overlay) > scrollContainer > content
    scrollContainer.appendChild(content);
    modal.appendChild(scrollContainer);
    document.body.appendChild(modal);

    // 开始轮询支付状态
    startPaymentPolling(paymentData.out_trade_no);
  }

  // 显示微信支付界面
  function showWxPaymentInterface(paymentData) {
    hideLoading();

    const modal = document.createElement('div');
    modal.id = 'zpay-payment-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
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
      max-width: 420px;
      max-height: 80vh;
      overflow-y: auto !important;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
      touch-action: pan-y;
      box-sizing: border-box;
      scrollbar-width: thin;
      scrollbar-color: #09BB07 rgba(0, 0, 0, 0.05);
    `;

    // 为当前滚动容器添加类名以便样式定位
    scrollContainer.className = 'wx-payment-scroll';

    if (!document.getElementById('wx-payment-scrollbar-styles')) {
      const style = document.createElement('style');
      style.id = 'wx-payment-scrollbar-styles';
      style.textContent = `
        .wx-payment-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .wx-payment-scroll::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 3px;
        }

        .wx-payment-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #09BB07 0%, #00D100 100%);
          border-radius: 3px;
          transition: all 0.3s ease;
        }

        .wx-payment-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #00A300 0%, #00BB00 100%);
          box-shadow: 0 2px 4px rgba(9, 187, 7, 0.3);
        }

        .wx-payment-scroll::-webkit-scrollbar-thumb:active {
          background: linear-gradient(135deg, #008800 0%, #009900 100%);
        }
      `;
      document.head.appendChild(style);
    }

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 0;
      border-radius: 12px;
      text-align: center;
      width: 100%;
      position: relative;
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15);
      min-height: 400px;
    `;

    let paymentContent = `
      <!-- 微信风格顶部绿色区域 -->
      <div style="background: linear-gradient(135deg, #09BB07 0%, #00D100 100%); padding: 24px 30px; color: white; position: relative;">
        <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
          <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M8.691 2.188C8.691 1.531 8.159 1 7.5 1S6.309 1.531 6.309 2.188v11.85c-.76-.648-1.77-1.188-2.809-1.188C1.636 12.85.5 13.987.5 15.35S1.636 17.85 3.5 17.85c1.864 0 3-1.136 3-2.5V6.518c1.09.757 2.295 1.394 3.691 1.394 1.396 0 2.601-.637 3.691-1.394v8.832c0 1.364 1.136 2.5 3 2.5s3-1.136 3-2.5-1.136-2.5-3-2.5c-1.039 0-2.049.54-2.809 1.188V2.188C13.309 1.531 12.777 1 12.118 1s-1.191.531-1.191 1.188v11.85c-.76-.648-1.77-1.188-2.809-1.188C6.254 12.85 5.118 13.987 5.118 15.35s1.136 2.5 3 2.5 3-1.136 3-2.5V6.518c1.09.757 2.295 1.394 3.691 1.394 1.396 0 2.601-.637 3.691-1.394v8.832c0 1.364 1.136 2.5 3 2.5s3-1.136 3-2.5-1.136-2.5-3-2.5Z"/>
            </svg>
          </div>
          <div>
            <h3 style="color: white; margin: 0; font-size: 18px; font-weight: 600;">确认支付</h3>
          </div>
        </div>
        <div style="background: rgba(255,255,255,0.1); padding: 12px 16px; border-radius: 8px; margin-top: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="color: rgba(255,255,255,0.8); font-size: 14px;">商品</span>
            <span style="color: white; font-size: 14px; font-weight: 500;">IC Studio 视奏工具</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="color: rgba(255,255,255,0.8); font-size: 14px;">订单号</span>
            <span style="color: white; font-size: 12px; font-family: monospace;">${paymentData.out_trade_no}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: rgba(255,255,255,0.8); font-size: 14px;">金额</span>
            <span style="color: white; font-size: 20px; font-weight: 600;">¥${paymentData.order_info?.money || '1.00'}</span>
          </div>
        </div>
      </div>

      <!-- 主要内容区域 -->
      <div style="padding: 24px 30px;">
        <!-- 使用条款确认 - 微信风格 -->
        <div id="payment-terms-section" style="margin-bottom: 24px; padding: 16px; background: #F0F9FF; border-radius: 8px; border: 1px solid #E0F2FE; text-align: left;">
          <label style="display: flex; align-items: flex-start; cursor: pointer; font-size: 14px; color: #333;">
            <input type="checkbox" id="payment-terms-checkbox" onchange="togglePaymentQRCode()" style="margin-right: 12px; margin-top: 2px; transform: scale(1.3); accent-color: #09BB07;">
            <span>我已阅读并同意 <a href="#" onclick="showPaymentTermsDialog()" style="color: #09BB07; text-decoration: none; font-weight: 500;">《用户协议》</a> 和 <a href="#" onclick="showPaymentPrivacyDialog()" style="color: #09BB07; text-decoration: none; font-weight: 500;">《隐私政策》</a></span>
          </label>
        </div>

        <!-- 支付二维码区域（初始隐藏） -->
        <div id="payment-qrcode-section" style="display: none;">
    `;

    // 根据API返回的支付方式显示不同内容
    if (paymentData.img) {
      // 有二维码图片，直接显示（微信风格）
      paymentContent += `
        <div style="background: #F0FDF4; border-radius: 12px; padding: 24px; margin-bottom: 20px; border: 1px solid #BBF7D0;">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <div style="width: 24px; height: 24px; background: #09BB07; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 8px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M3,11H5V13H3V11M11,5H13V9H11V5M9,11H13V15H11V13H9V11M15,5H19V9H17V7H15V5M19,13V15H17V11H19V13M21,21H3V19H21V21Z"/>
              </svg>
            </div>
            <span style="color: #09BB07; font-weight: 600; font-size: 16px;">扫码支付</span>
          </div>
          <div style="display: flex; justify-content: center; margin-bottom: 16px;">
            <div style="padding: 12px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <img src="${paymentData.img}" alt="微信支付二维码" style="width: 180px; height: 180px; display: block; border-radius: 4px;">
            </div>
          </div>
          <div style="text-align: center;">
            <p style="color: #09BB07; font-size: 14px; margin: 0 0 4px 0; font-weight: 500;">请使用微信扫描二维码</p>
            <p style="color: #666; font-size: 12px; margin: 0;">扫码后确认支付即可获得访问码</p>
          </div>
        </div>
      `;
    } else if (paymentData.payurl) {
      // 有支付链接，提供按钮跳转（微信风格）
      paymentContent += `
        <div style="background: #F0FDF4; border-radius: 12px; padding: 24px; margin-bottom: 20px; border: 1px solid #BBF7D0; text-align: center;">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #09BB07 0%, #00D100 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"/>
              </svg>
            </div>
          </div>
          <h4 style="color: #09BB07; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">微信支付</h4>
          <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">点击下方按钮跳转到微信完成支付</p>
          <button onclick="window.open('${paymentData.payurl}', '_blank')" style="
            background: linear-gradient(135deg, #09BB07 0%, #00D100 100%);
            color: white;
            padding: 14px 32px;
            border: none;
            border-radius: 25px;
            font-weight: 600;
            font-size: 16px;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(9, 187, 7, 0.3);
            transition: all 0.3s ease;
            width: 100%;
            max-width: 200px;
          " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(9, 187, 7, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 16px rgba(9, 187, 7, 0.3)'">
            立即支付
          </button>
          <p style="color: #999; font-size: 12px; margin: 12px 0 0 0;">支付完成后页面将自动更新</p>
        </div>
      `;
    } else if (paymentData.qrcode) {
      // 有二维码链接但无图片（居中对齐）
      paymentContent += `
        <div style="margin: 20px 0; padding: 20px; border: 2px dashed #ddd; border-radius: 8px; display: flex; flex-direction: column; align-items: center;">
          <p style="margin: 0 0 15px 0; color: #666; text-align: center;">扫码支付</p>
          <button onclick="window.open('${paymentData.qrcode}', '_blank')" style="
            background: #f0f0f0;
            color: #333;
            padding: 10px 20px;
            border: 1px solid #ddd;
            border-radius: 6px;
            cursor: pointer;
          ">打开二维码</button>
        </div>
      `;
    } else {
      // fallback - 直接显示支付链接（居中对齐）
      paymentContent += `
        <div style="margin: 20px 0; display: flex; flex-direction: column; align-items: center;">
          <p style="color: #f56565; margin-bottom: 15px; text-align: center;">⚠️ 未获取到支付二维码</p>
          <p style="color: #666; font-size: 14px; text-align: center;">请联系客服处理</p>
        </div>
      `;
    }

    // 支付状态显示区域（微信风格）
    paymentContent += `
        <div id="payment-status" style="margin-top: 16px; padding: 16px; background: #F0FDF4; border-radius: 8px; text-align: center; border: 1px solid #BBF7D0;">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
            <div id="status-icon" style="font-size: 18px; margin-right: 8px;">🔍</div>
            <div id="status-text" style="color: #09BB07; font-size: 14px; font-weight: 500;">正在检测支付状态...</div>
          </div>
        </div>
      </div>
    `;

    // 关闭按钮 - 微信风格
    paymentContent += `
      <button onclick="window.closePaymentModal()" style="
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(255,255,255,0.9);
        border: none;
        font-size: 16px;
        color: rgba(255,255,255,0.8);
        cursor: pointer;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      " onmouseover="this.style.background='rgba(255,255,255,1)'; this.style.color='#999'" onmouseout="this.style.background='rgba(255,255,255,0.9)'; this.style.color='rgba(255,255,255,0.8)'">×</button>
    `;

    content.innerHTML = paymentContent;

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

    // 组装弹窗结构：modal(overlay) > scrollContainer > content
    scrollContainer.appendChild(content);
    modal.appendChild(scrollContainer);
    document.body.appendChild(modal);

    // 开始轮询支付状态
    startPaymentPolling(paymentData.out_trade_no);
  }

  // 开始支付状态轮询
  function startPaymentPolling(out_trade_no) {
    let pollCount = 0;
    const maxPolls = 120; // 最多轮询5分钟
    
    const polling = setInterval(async () => {
      pollCount++;
      
      try {
        const response = await fetch(`${API_ENDPOINTS.checkOrder}?out_trade_no=${encodeURIComponent(out_trade_no)}`);
        const result = await response.json();
        
        console.log('[zpay-simple] 支付状态查询:', result);
        
        if (result.ok && result.paid) {
          // 支付成功
          clearInterval(polling);
          
          const statusIcon = document.getElementById('status-icon');
          const statusText = document.getElementById('status-text');
          
          if (statusIcon) statusIcon.textContent = '✅';
          if (statusText) statusText.textContent = '支付成功！正在生成访问码...';
          
          setTimeout(() => {
            window.closePaymentModal();
            if (result.access_code) {
              // 使用统一支付成功处理器（支持支付宝账号收集）
              if (window.showUnifiedPaymentSuccess) {
                window.showUnifiedPaymentSuccess(result.access_code, 'zpay-simple');
              } else {
                // 降级到原有显示方式
                showAccessCode(result.access_code, result.order_info);
              }
            } else {
              alert('支付成功！访问码正在生成中，请稍后刷新页面查看。');
            }
          }, 2000);
          
        } else if (pollCount >= maxPolls) {
          // 轮询超时
          clearInterval(polling);
          
          const statusIcon = document.getElementById('status-icon');
          const statusText = document.getElementById('status-text');
          
          if (statusIcon) statusIcon.textContent = '⏰';
          if (statusText) statusText.textContent = '支付检测超时，请手动刷新页面确认';
        }
        
      } catch (error) {
        console.error('[zpay-simple] 支付状态查询失败:', error);
        
        if (pollCount >= maxPolls) {
          clearInterval(polling);
          
          const statusIcon = document.getElementById('status-icon');
          const statusText = document.getElementById('status-text');
          
          if (statusIcon) statusIcon.textContent = '❌';
          if (statusText) statusText.textContent = '网络错误，请手动刷新确认支付状态';
        }
      }
    }, 3000); // 每3秒检查一次
  }

  // 关闭支付模态框
  window.closePaymentModal = function() {
    const modal = document.getElementById('zpay-payment-modal');
    if (modal) modal.remove();
  };

  // 主支付函数 - 支付宝支付
  window.createZPayment = async function() {
    console.log('[zpay-simple] 开始支付宝支付流程');
    console.log('[zpay-simple] createZPayment函数被调用');

    showLoading('正在创建支付宝订单');

    try {
      // 调用云函数创建支付订单
      const response = await fetch(API_ENDPOINTS.createPayment, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'IC Studio 视奏工具授权',
          money: '68.00',
          type: 'alipay'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('[zpay-simple] 支付宝支付创建结果:', result);

      if (!result.ok) {
        throw new Error(result.msg || '创建支付订单失败');
      }

      // 显示支付界面
      showPaymentInterface(result);

    } catch (error) {
      console.error('[zpay-simple] 支付宝支付创建失败:', error);
      hideLoading();
      alert(`支付创建失败: ${error.message}\n\n请检查网络连接或稍后重试`);
    }
  };

  // 微信支付函数
  window.createWxPayment = async function() {
    console.log('[zpay-simple] 开始微信支付流程');
    console.log('[zpay-simple] createWxPayment函数被调用');

    showLoading('正在创建微信支付订单');

    try {
      // 调用云函数创建微信支付订单
      const response = await fetch(API_ENDPOINTS.createPayment, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'IC Studio 视奏工具授权',
          money: '68.00',
          type: 'wxpay'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('[zpay-simple] 微信支付创建结果:', result);

      if (!result.ok) {
        throw new Error(result.msg || '创建微信支付订单失败');
      }

      // 显示支付界面
      showWxPaymentInterface(result);

    } catch (error) {
      console.error('[zpay-simple] 微信支付创建失败:', error);
      hideLoading();
      alert(`微信支付创建失败: ${error.message}\n\n请检查网络连接或稍后重试`);
    }
  };

  console.log('✅ Z-Pay API接口支付系统已加载');
  console.log('🔒 所有敏感信息安全存储在云函数中');
  console.log('💳 支持支付宝和微信两种支付方式');
  console.log('📱 支持二维码扫码和跳转支付两种方式');

  // 下载应用函数 - 显示平台选择界面
  window.downloadApp = function() {
    showDownloadSelection();
  };
  
  // 显示下载选择界面
  function showDownloadSelection() {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
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
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
      touch-action: pan-y;
      box-sizing: border-box;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 16px;
      text-align: center;
      width: 100%;
      position: relative;
      box-sizing: border-box;
    `;

    content.innerHTML = `
      <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">📦 选择安装包</h2>
      <p style="color: #666; margin: 0 0 25px 0;">请选择适合您操作系统的安装包：</p>
      
      <div style="display: grid; gap: 15px; margin: 25px 0;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <button onclick="window.downloadFile('/software-packages/IC Studio 视奏工具-1.0.0-win-x64.exe')" style="
            background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%);
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
          " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            🪟 Windows x64
          </button>
          <button onclick="window.downloadFile('/software-packages/IC Studio 视奏工具-1.0.0-win.exe')" style="
            background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%);
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
          " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            🪟 Windows 通用版
          </button>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <button onclick="window.downloadFile('/software-packages/IC Studio 视奏工具-1.0.0-mac-x64.dmg')" style="
            background: linear-gradient(135deg, #007aff 0%, #0051d2 100%);
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
          " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            🍎 macOS Intel
          </button>
          <button onclick="window.downloadFile('/software-packages/IC Studio 视奏工具-1.0.0-mac-arm64.zip')" style="
            background: linear-gradient(135deg, #007aff 0%, #0051d2 100%);
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
          " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            🍎 macOS Apple Silicon
          </button>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <button onclick="window.downloadFile('/software-packages/IC Studio 视奏工具-1.0.0-linux-x86_64.AppImage')" style="
            background: linear-gradient(135deg, #f77f00 0%, #d62d20 100%);
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
          " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            🐧 Linux AppImage
          </button>
          <button onclick="window.downloadFile('/software-packages/IC Studio 视奏工具-1.0.0-linux-amd64.deb')" style="
            background: linear-gradient(135deg, #f77f00 0%, #d62d20 100%);
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
          " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            🐧 Linux DEB
          </button>
        </div>
      </div>
      
      <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 13px; color: #666;">
        💡 <strong>如何选择：</strong><br>
        • Windows 用户：推荐 Windows x64<br>
        • Mac 用户：M1/M2芯片选Apple Silicon，Intel芯片选Intel<br>
        • Linux 用户：推荐 AppImage（无需安装）
      </div>
      
      <button onclick="this.parentElement.parentElement.remove()" style="
        position: absolute;
        top: 15px;
        right: 15px;
        background: none;
        border: none;
        font-size: 24px;
        color: #999;
        cursor: pointer;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.2s;
      " onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='none'">×</button>
    `;

    // 组装弹窗结构：modal > scrollContainer > content
    scrollContainer.appendChild(content);
    modal.appendChild(scrollContainer);

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

    document.body.appendChild(modal);
  }
  
  // 下载文件函数
  window.downloadFile = function(filePath) {
    try {
      // 对URL进行编码以处理中文字符和空格
      const encodedPath = encodeURI(filePath);
      
      // 创建下载链接
      const link = document.createElement('a');
      link.href = encodedPath;
      
      // 设置下载文件名，去除路径只保留文件名
      const fileName = filePath.split('/').pop();
      link.download = fileName;
      
      // 设置链接属性以确保下载行为
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      
      // 临时添加到DOM并触发点击
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('🔗 下载链接已触发:', encodedPath);
      
      // 关闭下载选择界面
      const modal = document.querySelector('[style*="position: fixed"]');
      if (modal) modal.remove();
      
      // 显示下载提示
      setTimeout(() => {
        alert('✅ 下载已开始！\n\n文件: ' + fileName + '\n\n如果下载没有自动开始，请检查浏览器的下载设置或尝试右键保存文件。');
      }, 500);
      
    } catch (error) {
      console.error('下载失败:', error);
      alert('❌ 下载失败，请稍后重试或联系技术支持。\n\n错误信息: ' + error.message);
    }
  };
  
  // 开始使用函数 - 服务器端验证后激活并跳转
  window.startUsing = async function(accessCode) {
    try {
      console.log('🔐 开始服务器端验证访问码:', accessCode);
      
      // 显示验证中状态
      showVerificationProgress();
      
      // 调用CloudBase云函数进行服务器端验证
      const response = await fetch('https://cloud1-4g1r5ho01a0cfd85.service.tcloudbase.com/checkOrder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: accessCode
        })
      });
      
      if (!response.ok) {
        throw new Error(`服务器响应错误: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('🔍 服务器验证结果:', result);
      
      if (!result.success) {
        throw new Error(result.error || '访问码验证失败');
      }
      
      // 服务器端验证成功，创建激活数据
      const accessData = {
        code: accessCode,
        activated: true,
        verified_by_server: true,
        server_verification_time: result.data.verified_at,
        product_name: result.data.product_name,
        amount: result.data.amount,
        order_info: result.data.order_info,
        timestamp: new Date().toISOString(),
        expires: null, // 永久访问码
        method: 'server_verification'
      };
      
      // 只有验证成功后才保存数据
      localStorage.setItem('ic-premium-access', JSON.stringify(accessData));
      localStorage.setItem('ic_studio_access_code', accessCode);
      localStorage.setItem('ic_studio_premium_activated', 'true');
      localStorage.setItem('ic_studio_activation_time', new Date().toISOString());
      localStorage.setItem('server-verified-access', JSON.stringify(accessData));
      
      console.log('✅ 服务器验证成功，访问码已激活:', accessCode);
      
      // 关闭弹窗
      const modal = document.querySelector('[style*="position: fixed"]');
      if (modal) modal.remove();
      
      // 显示跳转提示并直接跳转到完整版
      showRedirectMessage();
      
    } catch (error) {
      console.error('❌ 服务器端验证失败:', error);
      
      // 关闭验证进度弹窗
      const progressModal = document.getElementById('verification-progress');
      if (progressModal) progressModal.remove();
      
      // 显示错误提示
      alert(`访问码验证失败: ${error.message}\n\n可能的原因：\n• 访问码无效或已过期\n• 网络连接问题\n• 服务器暂时不可用\n\n请稍后重试或联系技术支持。`);
    }
  };
  
  // 显示验证进度
  function showVerificationProgress() {
    const progressModal = document.createElement('div');
    progressModal.id = 'verification-progress';
    progressModal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
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

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      width: 100%;
      position: relative;
      box-sizing: border-box;
    `;

    content.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 20px; animation: spin 2s linear infinite;">🔐</div>
      <h3 style="margin: 0 0 15px 0; color: #333;">正在验证访问码...</h3>
      <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">请稍候，我们正在服务器端验证您的访问码有效性</p>
      <p style="margin: 0; color: #f39c12; font-size: 12px;">💡 刚支付完成的访问码可能需要等待10-15秒<br><small style="color: #999;">中国用户可能因网络环境需要更长时间</small></p>
    `;

    // 组装弹窗结构：progressModal > scrollContainer > content
    scrollContainer.appendChild(content);
    progressModal.appendChild(scrollContainer);

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

    document.body.appendChild(progressModal);
  }
  
  // 显示跳转提示并跳转到完整版
  function showRedirectMessage() {
    const redirectModal = document.createElement('div');
    redirectModal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
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

    const content = document.createElement('div');
    content.style.cssText = `
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: white;
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      width: 100%;
      position: relative;
      box-sizing: border-box;
    `;

    content.innerHTML = `
      <div style="font-size: 64px; margin-bottom: 20px;">🚀</div>
      <h2 style="margin: 0 0 15px 0;">激活成功！</h2>
      <p style="margin: 0 0 20px 0; opacity: 0.9; font-size: 16px;">正在跳转到完整版视奏工具...</p>
      <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; overflow: hidden; margin: 15px 0;">
        <div id="progress-bar" style="width: 0%; height: 100%; background: white; border-radius: 2px; transition: width 0.1s ease;"></div>
      </div>
      <p style="margin: 0; opacity: 0.8; font-size: 14px;" id="countdown-text">3秒后自动跳转...</p>
    `;

    // 组装弹窗结构：redirectModal > scrollContainer > content
    scrollContainer.appendChild(content);
    redirectModal.appendChild(scrollContainer);

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

    document.body.appendChild(redirectModal);
    
    // 进度条动画和倒计时
    let countdown = 3;
    let progress = 0;
    const interval = setInterval(() => {
      progress += 33.33;
      countdown--;
      
      const progressBar = document.getElementById('progress-bar');
      const countdownText = document.getElementById('countdown-text');
      
      if (progressBar) progressBar.style.width = progress + '%';
      if (countdownText) countdownText.textContent = countdown > 0 ? `${countdown}秒后自动跳转...` : '正在跳转...';
      
      if (countdown <= 0) {
        clearInterval(interval);
        // 跳转到完整版视奏工具，使用URL参数激活完整版
        window.location.href = '/tools/sight-reading-generator.html?premium=true&source=payment';
      }
    }, 1000);
  }
  
  // 显示激活成功提示
  function showActivationSuccess() {
    const successModal = document.createElement('div');
    successModal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
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

    const content = document.createElement('div');
    content.style.cssText = `
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: white;
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      width: 100%;
      position: relative;
      box-sizing: border-box;
    `;

    content.innerHTML = `
      <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
      <h2 style="margin: 0 0 15px 0;">高级功能已激活！</h2>
      <p style="margin: 0 0 20px 0; opacity: 0.9; font-size: 16px;">欢迎使用 IC Studio 视奏工具</p>
      <p style="margin: 0 0 25px 0; opacity: 0.8; font-size: 14px;">您现在可以使用所有高级功能了</p>
      
      <button onclick="this.parentElement.parentElement.remove(); window.location.reload()" style="
        background: rgba(255,255,255,0.2);
        color: white;
        border: 1px solid rgba(255,255,255,0.3);
        padding: 12px 30px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        transition: all 0.2s;
      " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
        开始体验
      </button>
    `;

    // 组装弹窗结构：successModal > scrollContainer > content
    scrollContainer.appendChild(content);
    successModal.appendChild(scrollContainer);

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

    document.body.appendChild(successModal);
  }

  // 支付弹窗中的使用条款功能
  window.togglePaymentQRCode = function() {
    const checkbox = document.getElementById('payment-terms-checkbox');
    const qrcodeSection = document.getElementById('payment-qrcode-section');
    
    if (checkbox && qrcodeSection) {
      qrcodeSection.style.display = checkbox.checked ? 'block' : 'none';
    }
  };

  window.showPaymentTermsDialog = function() {
    if (window.showMainTermsDialog) {
      window.showMainTermsDialog();
    } else if (window.showTermsDialog) {
      window.showTermsDialog();
    } else {
      // 创建临时条款弹窗
      showTempTermsDialog();
    }
  };

  window.showPaymentPrivacyDialog = function() {
    if (window.showMainPrivacyDialog) {
      window.showMainPrivacyDialog();
    } else if (window.showPrivacyDialog) {
      window.showPrivacyDialog();
    } else {
      // 创建临时隐私政策弹窗
      showTempPrivacyDialog();
    }
  };

  function showTempTermsDialog() {
    const dialog = document.createElement('div');
    dialog.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 100000; overflow-y: auto; -webkit-overflow-scrolling: touch; touch-action: auto; padding: 20px;';
    dialog.innerHTML = `
      <div style="background: white; padding: 30px; border-radius: 16px; max-width: 700px; max-height: 80vh; overflow-y: auto; margin: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.3);">
        <h3 style="color: #2d3748; margin-bottom: 20px; text-align: center;">📜 用户协议</h3>
        <div style="line-height: 1.6; color: #4a5568; font-size: 14px;">
          <p style="margin-bottom: 20px;">欢迎使用 <strong>IC Studio 视奏工具</strong>（以下简称"本产品"）。本协议是用户（以下简称"您"）与本产品开发者之间具有约束力的协议。请您在使用前仔细阅读并同意以下条款。</p>
          
          <h4>1. 服务说明</h4>
          <p>1.1 本产品为在线视奏训练工具，提供基础功能与增值的付费功能。</p>
          <p>1.2 本产品不断更新，功能内容可能随时调整，恕不另行通知。</p>
          
          <h4>2. 用户行为</h4>
          <p>2.1 您承诺合法使用本产品，不得利用本产品从事违法、侵权或扰乱网络秩序的行为。</p>
          <p>2.2 您不得以任何方式复制、反向工程、转售或擅自修改本产品。</p>
          
          <h4>3. 付费功能</h4>
          <p>3.1 您在支付成功后即可获得对应的付费功能使用权。</p>
          <p>3.2 具体收费标准和服务期限以页面展示为准。</p>
          
          <h4>4. 知识产权</h4>
          <p>4.1 本产品及相关代码、界面设计、名称、标识均归开发者所有。</p>
          <p>4.2 未经许可，您不得复制、传播或用于商业用途。</p>
          
          <h4>5. 免责声明</h4>
          <p>5.1 本产品按"现状"提供，不对特定目的或结果作出保证。</p>
          <p>5.2 在法律允许的范围内，因使用本产品导致的直接或间接损失，开发者不承担责任。</p>
          
          <h4>6. 协议修改</h4>
          <p>6.1 开发者可根据需要修改本协议，并在页面公布更新版本。</p>
          <p>6.2 您在修改后继续使用本产品即视为同意修改。</p>
          
          <p style="margin-top: 20px; text-align: center; color: #666; font-size: 12px;">最后更新日期：2025 年 9 月 7 日</p>
        </div>
        <div style="text-align: center; margin-top: 25px;">
          <button onclick="this.closest('div').parentElement.remove()" style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
            关闭
          </button>
        </div>
      </div>
    `;
    dialog.addEventListener('click', function(e) { if (e.target === dialog) dialog.remove(); });
    document.body.appendChild(dialog);
  }

  function showTempPrivacyDialog() {
    const dialog = document.createElement('div');
    dialog.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 100000; overflow-y: auto; -webkit-overflow-scrolling: touch; touch-action: auto; padding: 20px;';
    dialog.innerHTML = `
      <div style="background: white; padding: 30px; border-radius: 16px; max-width: 700px; max-height: 80vh; overflow-y: auto; margin: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.3);">
        <h3 style="color: #2d3748; margin-bottom: 20px; text-align: center;">🔒 隐私政策</h3>
        <div style="line-height: 1.6; color: #4a5568; font-size: 14px;">
          <p style="margin-bottom: 20px;"><strong>IC Studio 视奏工具</strong>（以下简称"本产品"）高度重视用户隐私。本政策说明我们如何收集、使用和保护您的信息。</p>
          
          <h4>1. 信息收集</h4>
          <p>- <strong>必要信息</strong>：支付时我们会收集邮箱、订单号、支付流水号。</p>
          <p>- 我们不会收集与服务无关的敏感信息（如身份证号）。</p>
          
          <h4>2. 信息使用</h4>
          <p>- 用于完成支付与开通功能。</p>
          <p>- 用于统计分析和改进产品体验。</p>
          <p>- 法律要求时可能配合执法机关提供。</p>
          
          <h4>3. 信息存储</h4>
          <p>- 所有数据存储在腾讯云 CloudBase 环境。</p>
          
          <h4>4. 信息共享</h4>
          <p>- 仅在必要时与支付服务商（Z-Pay）共享支付相关信息。</p>
          <p>- 除非法律要求，不会向其他第三方出售或提供您的信息。</p>
          
          <h4>5. 用户权利</h4>
          <p>- 您有权随时要求删除您的个人数据。</p>
          <p>- 联系邮箱：<code>service@icstudio.club</code>。</p>
          
          <h4>6. 政策更新</h4>
          <p>- 我们可能会不时更新本隐私政策，更新后将在页面公布。</p>
          
          <p style="margin-top: 20px; text-align: center; color: #666; font-size: 12px;">最后更新日期：2025 年 9 月 9 日</p>
        </div>
        <div style="text-align: center; margin-top: 25px;">
          <button onclick="this.closest('div').parentElement.remove()" style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
            关闭
          </button>
        </div>
      </div>
    `;
    dialog.addEventListener('click', function(e) { if (e.target === dialog) dialog.remove(); });
    document.body.appendChild(dialog);
  }

})();

// 复制到剪贴板功能
function copyToClipboard(text) {
    console.log('📋 复制访问码:', text);
    
    // 使用现代的Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showSuccessMessage('访问码已复制到剪贴板');
        }).catch(err => {
            console.error('复制失败:', err);
            fallbackCopyTextToClipboard(text);
        });
    } else {
        // 降级方案
        fallbackCopyTextToClipboard(text);
    }
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showSuccessMessage('访问码已复制到剪贴板');
        } else {
            showSuccessMessage('复制失败，请手动复制', 'error');
        }
    } catch (err) {
        console.error('降级复制失败:', err);
        showSuccessMessage('复制失败，请手动复制', 'error');
    }
    
    document.body.removeChild(textArea);
}

function showSuccessMessage(message, type = 'success') {
    // 创建临时通知
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? '#22c55e' : '#ef4444';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 10001;
        font-size: 14px;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = type === 'success' ? `✅ ${message}` : `❌ ${message}`;
    
    document.body.appendChild(notification);
    
    // 3秒后移除通知
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }
    }, 3000);
}

// 暴露到全局作用域
window.copyToClipboard = copyToClipboard;

// 页面加载完成后测试函数是否可用
document.addEventListener('DOMContentLoaded', function() {
  console.log('[zpay-simple] 脚本已加载完成');
  console.log('[zpay-simple] createZPayment函数是否可用:', typeof window.createZPayment === 'function');
});