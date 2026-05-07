/**
 * Z-Pay CloudBase 安全支付实现
 * 通过云函数处理支付，前端不暴露敏感信息
 */

(function() {
  'use strict';

  // 云函数配置 - 替换为您的实际云函数HTTP访问地址
  const API_ENDPOINTS = {
    createOrder: 'https://您的环境ID-您的云函数域名.service.tcloudbase.com/createOrder',
    queryStatus: 'https://您的环境ID-您的云函数域名.service.tcloudbase.com/queryStatus'
  };

  // 支付状态管理
  let currentOrder = null;
  let statusPollingInterval = null;

  // 显示支付模态框
  function showPaymentModal(orderData) {
    // 移除已存在的模态框
    const existingModal = document.getElementById('zpay-modal');
    if (existingModal) existingModal.remove();

    // 创建模态框
    const overlay = document.createElement('div');
    overlay.id = 'zpay-modal';
    overlay.style.cssText = `
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
      animation: fadeIn 0.3s ease-out;
      padding: 20px;
      box-sizing: border-box;
    `;

    // 创建滚动容器
    const scrollContainer = document.createElement('div');
    scrollContainer.style.cssText = `
      width: 100%;
      max-width: 450px;
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
      background: white;
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
      width: 100%;
      position: relative;
      box-sizing: border-box;
    `;

    // 模态框内容
    let modalContent = `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #333; margin: 0 0 10px 0; font-size: 20px;">支付订单</h3>
        <p style="color: #666; margin: 0; font-size: 14px;">订单号: ${orderData.out_trade_no}</p>
      </div>
    `;

    // 根据返回的支付信息显示不同内容
    if (orderData.img) {
      // 有二维码图片，直接显示
      modalContent += `
        <div style="margin: 20px 0;">
          <img src="${orderData.img}" alt="支付二维码" style="width: 200px; height: 200px; border: 1px solid #ddd; border-radius: 8px;">
        </div>
        <p style="color: #666; font-size: 14px; margin: 10px 0;">请使用支付宝扫描二维码完成支付</p>
      `;
    } else if (orderData.qrcode) {
      // 有二维码链接，需要生成二维码（这里简化处理）
      modalContent += `
        <div style="margin: 20px 0; padding: 20px; border: 2px dashed #ddd; border-radius: 8px;">
          <p style="margin: 0; color: #666;">二维码支付</p>
          <a href="${orderData.qrcode}" target="_blank" style="color: #1677FF; text-decoration: none;">点击打开支付链接</a>
        </div>
      `;
    } else if (orderData.payurl) {
      // 只有支付链接，在新窗口打开
      window.open(orderData.payurl, '_blank');
      modalContent += `
        <div style="margin: 20px 0;">
          <div style="font-size: 48px; margin-bottom: 15px;">🚀</div>
          <p style="color: #333; font-size: 16px; margin: 0 0 10px 0;">支付页面已在新窗口打开</p>
          <p style="color: #666; font-size: 14px; margin: 0;">请在新窗口完成支付，支付成功后会自动识别</p>
        </div>
      `;
    }

    // 支付状态显示区域
    modalContent += `
      <div id="payment-status" style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; display: none;">
        <div id="status-icon" style="font-size: 24px; margin-bottom: 8px;">⏳</div>
        <div id="status-text" style="color: #666; font-size: 14px;">检查支付状态中...</div>
      </div>
    `;

    // 关闭按钮
    modalContent += `
      <button onclick="window.closePaymentModal()" style="
        position: absolute;
        top: 15px;
        right: 15px;
        background: none;
        border: none;
        font-size: 20px;
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

    modal.innerHTML = modalContent;

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

    // 添加CSS动画
    if (!document.getElementById('zpay-modal-styles')) {
      const style = document.createElement('style');
      style.id = 'zpay-modal-styles';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .payment-checking {
          animation: pulse 1.5s ease-in-out infinite;
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(overlay);
    
    return overlay;
  }

  // 关闭支付模态框
  window.closePaymentModal = function() {
    const modal = document.getElementById('zpay-modal');
    if (modal) modal.remove();
    
    // 停止轮询
    if (statusPollingInterval) {
      clearInterval(statusPollingInterval);
      statusPollingInterval = null;
    }
  };

  // 开始轮询支付状态
  function startStatusPolling(out_trade_no) {
    // 显示状态检查区域
    const statusDiv = document.getElementById('payment-status');
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');
    
    if (statusDiv) {
      statusDiv.style.display = 'block';
      statusIcon.className = 'payment-checking';
    }

    let pollCount = 0;
    const maxPolls = 120; // 最多轮询5分钟 (120次 * 2.5秒)
    
    statusPollingInterval = setInterval(async () => {
      pollCount++;
      
      try {
        const response = await fetch(`${API_ENDPOINTS.queryStatus}?out_trade_no=${encodeURIComponent(out_trade_no)}`);
        const result = await response.json();
        
        console.log('[Payment] 状态查询结果:', result);
        
        if (result.ok && result.paid) {
          // 支付成功
          clearInterval(statusPollingInterval);
          statusPollingInterval = null;
          
          if (statusIcon) statusIcon.textContent = '✅';
          if (statusText) statusText.textContent = '支付成功！访问码已生成';
          
          // 显示访问码
          setTimeout(() => {
            if (result.access_code) {
              showAccessCode(result.access_code);
            } else {
              alert('支付成功！访问码正在生成中，请稍候...');
            }
            window.closePaymentModal();
          }, 2000);
          
        } else if (pollCount >= maxPolls) {
          // 轮询超时
          clearInterval(statusPollingInterval);
          statusPollingInterval = null;
          
          if (statusIcon) statusIcon.textContent = '⚠️';
          if (statusText) statusText.textContent = '支付状态检查超时，请手动刷新确认';
        }
        
      } catch (error) {
        console.error('[Payment] 状态查询失败:', error);
        
        if (pollCount >= maxPolls) {
          clearInterval(statusPollingInterval);
          statusPollingInterval = null;
          
          if (statusIcon) statusIcon.textContent = '❌';
          if (statusText) statusText.textContent = '网络错误，请手动检查支付状态';
        }
      }
    }, 2500); // 每2.5秒检查一次
  }

  // 显示访问码
  function showAccessCode(accessCode) {
    alert(`🎉 支付成功！\n\n您的访问码是：${accessCode}\n\n请保存好此访问码，用于访问付费功能。`);
  }

  // 主支付函数
  window.createZPayment = async function() {
    console.log('🚀 启动CloudBase安全支付流程');
    
    // 显示加载状态
    const loadingModal = showPaymentModal({
      out_trade_no: '创建中...',
      loading: true
    });
    
    loadingModal.querySelector('#zpay-modal > div').innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 48px; margin-bottom: 20px; animation: pulse 1.5s ease-in-out infinite;">💳</div>
        <h3 style="color: #333; margin: 0 0 15px 0;">正在创建支付订单</h3>
        <p style="color: #666; margin: 0;">请稍候...</p>
      </div>
    `;
    
    try {
      // 调用云函数创建订单
      const response = await fetch(API_ENDPOINTS.createOrder, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'IC Studio 视奏工具授权',
          money: '248.00',
          type: 'alipay'
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('[Payment] 订单创建结果:', result);
      
      // 移除加载模态框
      window.closePaymentModal();
      
      if (!result.ok) {
        throw new Error(result.msg || '创建支付订单失败');
      }
      
      // 保存当前订单信息
      currentOrder = result;
      
      // 显示支付模态框
      showPaymentModal(result);
      
      // 开始轮询支付状态
      startStatusPolling(result.out_trade_no);
      
    } catch (error) {
      console.error('[Payment] 创建订单失败:', error);
      
      // 移除加载模态框
      window.closePaymentModal();
      
      // 显示错误信息
      alert(`支付创建失败: ${error.message}\n\n请检查网络连接或稍后重试`);
    }
  };

  console.log('✅ Z-Pay CloudBase 安全支付系统已加载');
  console.log('🔒 所有敏感信息安全存储在云函数中');

})();
