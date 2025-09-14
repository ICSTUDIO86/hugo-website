/**
 * IC Studio - 新版支付成功处理器
 * 基于用户提供的设计图重新设计
 */

(function() {
    'use strict';

    console.log('🎯 新版支付处理器启动...');

    // 清理现有的支付成功界面
    function removeAllPaymentOverlays() {
        const overlays = document.querySelectorAll('.payment-success-overlay, .payment-success');
        overlays.forEach(overlay => {
            overlay.remove();
            console.log('🗑️ 已移除旧的支付界面');
        });
    }

    // 复制访问码功能
    window.copyAccessCode = function(accessCode) {
        navigator.clipboard.writeText(accessCode).then(() => {
            const container = document.getElementById('access-code-container');
            const originalBg = container.style.background;
            container.style.background = 'rgba(76, 175, 80, 0.4)';

            // 显示复制成功提示
            const copyTip = document.createElement('div');
            copyTip.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(76, 175, 80, 0.9);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                z-index: 1000;
                pointer-events: none;
            `;
            copyTip.textContent = '✅ 已复制';
            container.appendChild(copyTip);

            setTimeout(() => {
                container.style.background = originalBg;
                if (copyTip.parentNode) {
                    copyTip.parentNode.removeChild(copyTip);
                }
            }, 1500);
        }).catch(() => {
            alert('访问码已复制：' + accessCode);
        });
    };

    // 统一的支付成功处理函数 - 暴露到全局
    window.showUnifiedPaymentSuccess = function(accessCode, source = 'unified', orderInfo = null) {
        // 先移除任何现有的界面
        removeAllPaymentOverlays();

        // 保存访问码到localStorage
        const accessData = {
            code: accessCode,
            activatedAt: Date.now(),
            deviceId: 'unified-' + Date.now(),
            expiresAt: null,
            version: '4.0-mobile-style',
            source: source,
            autoFill: true
        };
        localStorage.setItem('ic-premium-access', JSON.stringify(accessData));

        // 获取订单详细信息
        async function getOrderInfo() {
            if (orderInfo) {
                return orderInfo;
            }

            try {
                console.log('🔍 正在获取订单详细信息...');
                const response = await fetch('https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/checkOrderDetails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Request-Source': 'IC-Studio-Payment-Success'
                    },
                    body: JSON.stringify({
                        access_code: accessCode
                    })
                });

                const result = await response.json();
                if (result.success && result.orders && result.orders.length > 0) {
                    console.log('✅ 订单信息获取成功');
                    return result.orders[0];
                }
            } catch (error) {
                console.log('⚠️ 获取订单信息失败:', error);
            }

            return null;
        }

        // 异步创建和显示支付成功界面
        async function createAndShowPaymentSuccess() {
            // 获取订单详细信息
            const orderData = await getOrderInfo();

            // 准备显示数据
            console.log('📋 订单数据详情:', orderData);
            const orderNumber = orderData?.out_trade_no || orderData?.order_id || 'IC' + Date.now().toString().substr(-8);
            const paymentAmount = orderData?.amount || orderData?.money || '48.00';

            const successHtml = `
              <div class="payment-success-overlay" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                backdrop-filter: blur(8px);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              ">
                <div class="payment-success" style="
                  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
                  padding: 40px 30px 30px;
                  border-radius: 20px;
                  text-align: center;
                  max-width: 320px;
                  width: 90%;
                  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                  color: white;
                  position: relative;
                  overflow: hidden;
                ">
                  <!-- 庆祝图标 -->
                  <div style="
                    font-size: 60px;
                    margin-bottom: 20px;
                    position: relative;
                    z-index: 2;
                  ">🎉</div>

                  <!-- 标题和副标题 -->
                  <h2 style="
                    color: white;
                    margin: 0 0 8px 0;
                    font-size: 24px;
                    font-weight: 600;
                    position: relative;
                    z-index: 2;
                  ">支付成功！</h2>
                  <p style="
                    color: rgba(255, 255, 255, 0.9);
                    margin: 0 0 30px 0;
                    font-size: 16px;
                    position: relative;
                    z-index: 2;
                  ">
                    感谢您的购买
                  </p>

                  <!-- 访问码标题 -->
                  <p style="
                    color: white;
                    margin: 0 0 15px 0;
                    font-size: 16px;
                    font-weight: 500;
                    position: relative;
                    z-index: 2;
                  ">您的访问码</p>

                  <!-- 访问码显示框 -->
                  <div id="access-code-container" style="
                    background: rgba(255, 255, 255, 0.25);
                    border-radius: 12px;
                    padding: 20px 15px;
                    margin: 0 0 15px 0;
                    position: relative;
                    z-index: 2;
                    backdrop-filter: blur(10px);
                    cursor: pointer;
                    transition: all 0.3s ease;
                  " onclick="copyAccessCode('${accessCode}')" onmouseover="this.style.background='rgba(255,255,255,0.35)'" onmouseout="this.style.background='rgba(255,255,255,0.25)'">
                    <p id="access-code-display" style="
                      font-family: 'Courier New', monospace;
                      font-size: 20px;
                      font-weight: bold;
                      letter-spacing: 2px;
                      margin: 0;
                      color: white;
                      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                    ">${accessCode}</p>
                  </div>

                  <!-- 复制提示 -->
                  <p style="
                    color: rgba(255, 255, 255, 0.8);
                    margin: 0 0 20px 0;
                    font-size: 14px;
                    position: relative;
                    z-index: 2;
                  ">请保存好您的访问码</p>

                  <!-- 订单信息 -->
                  <div style="
                    text-align: left;
                    margin: 0 0 25px 0;
                    position: relative;
                    z-index: 2;
                  ">
                    <p style="
                      color: rgba(255, 255, 255, 0.9);
                      margin: 0 0 5px 0;
                      font-size: 14px;
                    ">订单号: <span style="font-family: monospace; font-size: 13px;">${orderNumber}</span></p>
                    <p style="
                      color: rgba(255, 255, 255, 0.9);
                      margin: 0;
                      font-size: 14px;
                    ">金额: <span style="font-weight: 600;">¥${paymentAmount}</span></p>
                  </div>

                  <!-- 下载应用按钮 -->
                  <button id="show-download-options-btn" style="
                    background: #4CAF50;
                    color: white;
                    border: none;
                    padding: 15px 20px;
                    border-radius: 12px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 16px;
                    width: 100%;
                    margin: 0 0 12px 0;
                    position: relative;
                    z-index: 2;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
                  " onmouseover="this.style.background='#45a049'" onmouseout="this.style.background='#4CAF50'">
                    📱 下载应用
                  </button>

                  <!-- 开始使用按钮 -->
                  <button id="start-using-btn" style="
                    background: #FF9800;
                    color: white;
                    border: none;
                    padding: 15px 20px;
                    border-radius: 12px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 16px;
                    width: 100%;
                    margin: 0 0 12px 0;
                    position: relative;
                    z-index: 2;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
                  " onmouseover="this.style.background='#f57c00'" onmouseout="this.style.background='#FF9800'">
                    🚀 开始使用
                  </button>

                  <!-- 关闭按钮 -->
                  <button onclick="document.querySelector('.payment-success-overlay').remove()" style="
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    padding: 12px 20px;
                    border-radius: 12px;
                    cursor: pointer;
                    font-weight: 500;
                    font-size: 14px;
                    position: relative;
                    z-index: 2;
                    transition: all 0.3s ease;
                    backdrop-filter: blur(10px);
                  " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                    关闭
                  </button>

                  <!-- 隐藏的下载选项面板 -->
                  <div id="download-options-panel" style="display: none; margin-top: 15px; position: relative; z-index: 2;">
                    <div style="background: rgba(255, 255, 255, 0.15); padding: 20px; border-radius: 12px; text-align: left; backdrop-filter: blur(10px);">
                      <p style="font-weight: bold; font-size: 14px; margin: 0 0 15px 0; color: white; text-align: center;">
                        选择您的操作系统：
                      </p>

                      <!-- Windows -->
                      <div style="margin-bottom: 12px;">
                        <p style="font-weight: bold; font-size: 12px; margin: 0 0 5px 0; color: #FFD700;">
                          🖥️ Windows
                        </p>
                        <button class="download-btn" data-platform="windows-exe" style="
                          margin: 2px 5px 2px 0;
                          padding: 8px 12px;
                          background: #dc3545;
                          color: white;
                          border: none;
                          border-radius: 6px;
                          cursor: pointer;
                          font-size: 11px;
                          font-weight: 500;
                          transition: all 0.3s ease;
                        ">
                          标准版 (140.9MB)
                        </button>
                        <button class="download-btn" data-platform="windows-x64" style="
                          margin: 2px 5px 2px 0;
                          padding: 8px 12px;
                          background: #dc3545;
                          color: white;
                          border: none;
                          border-radius: 6px;
                          cursor: pointer;
                          font-size: 11px;
                          font-weight: 500;
                          transition: all 0.3s ease;
                        ">
                          优化版 (73.2MB)
                        </button>
                      </div>

                      <!-- macOS -->
                      <div style="margin-bottom: 12px;">
                        <p style="font-weight: bold; font-size: 12px; margin: 0 0 5px 0; color: #FFD700;">
                          🍎 macOS
                        </p>
                        <button class="download-btn" data-platform="macos-x64-dmg" style="
                          margin: 2px 5px 2px 0;
                          padding: 8px 12px;
                          background: #6f42c1;
                          color: white;
                          border: none;
                          border-radius: 6px;
                          cursor: pointer;
                          font-size: 11px;
                          font-weight: 500;
                          transition: all 0.3s ease;
                        ">
                          Intel (DMG)
                        </button>
                        <button class="download-btn" data-platform="macos-x64-zip" style="
                          margin: 2px 5px 2px 0;
                          padding: 8px 12px;
                          background: #6f42c1;
                          color: white;
                          border: none;
                          border-radius: 6px;
                          cursor: pointer;
                          font-size: 11px;
                          font-weight: 500;
                          transition: all 0.3s ease;
                        ">
                          Intel (ZIP)
                        </button>
                        <button class="download-btn" data-platform="macos-arm64-zip" style="
                          margin: 2px 5px 2px 0;
                          padding: 8px 12px;
                          background: #6f42c1;
                          color: white;
                          border: none;
                          border-radius: 6px;
                          cursor: pointer;
                          font-size: 11px;
                          font-weight: 500;
                          transition: all 0.3s ease;
                        ">
                          M1/M2/M3 (ZIP)
                        </button>
                      </div>

                      <!-- Linux -->
                      <div style="margin-bottom: 8px;">
                        <p style="font-weight: bold; font-size: 12px; margin: 0 0 5px 0; color: #FFD700;">
                          🐧 Linux
                        </p>
                        <button class="download-btn" data-platform="linux-deb" style="
                          margin: 2px 5px 2px 0;
                          padding: 8px 12px;
                          background: #fd7e14;
                          color: white;
                          border: none;
                          border-radius: 6px;
                          cursor: pointer;
                          font-size: 11px;
                          font-weight: 500;
                          transition: all 0.3s ease;
                        ">
                          DEB包 (70.3MB)
                        </button>
                        <button class="download-btn" data-platform="linux-appimage" style="
                          margin: 2px 5px 2px 0;
                          padding: 8px 12px;
                          background: #fd7e14;
                          color: white;
                          border: none;
                          border-radius: 6px;
                          cursor: pointer;
                          font-size: 11px;
                          font-weight: 500;
                          transition: all 0.3s ease;
                        ">
                          AppImage (77.6MB)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `;

            // 添加到页面
            document.body.insertAdjacentHTML('beforeend', successHtml);

            return orderData;
        }

        // 创建和显示界面
        createAndShowPaymentSuccess().then((orderData) => {
            // 绑定显示下载选项按钮
            document.getElementById('show-download-options-btn').onclick = function() {
                const panel = document.getElementById('download-options-panel');
                const btn = this;

                if (panel.style.display === 'none') {
                    panel.style.display = 'block';
                    btn.innerHTML = '📦 收起选项';
                } else {
                    panel.style.display = 'none';
                    btn.innerHTML = '📱 下载应用';
                }
            };

            // 绑定各个下载按钮的功能
            document.querySelectorAll('.download-btn').forEach(btn => {
                btn.onclick = async function() {
                    const platform = this.getAttribute('data-platform');
                    const originalText = this.innerHTML;
                    this.innerHTML = '⏳ 获取链接...';

                    try {
                        console.log(`📥 开始下载 ${platform} 版本`);

                        // 调用下载云函数
                        const response = await fetch('https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/downloadInstaller', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Request-Source': 'IC-Studio-Payment-Success'
                            },
                            body: JSON.stringify({
                                access_code: accessCode,
                                platform: platform
                            })
                        });

                        const result = await response.json();
                        console.log('📥 下载响应:', result);

                        if (result.success && result.data && result.data.download_url) {
                            // 创建下载链接
                            const link = document.createElement('a');
                            link.href = result.data.download_url;
                            link.download = result.data.package_info.name;
                            link.style.display = 'none';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);

                            // 显示成功状态
                            this.innerHTML = '✅ 下载开始';
                            console.log(`🎉 ${result.data.package_info.name} 下载已开始`);
                        } else {
                            throw new Error(result.error || '获取下载链接失败');
                        }
                    } catch (error) {
                        console.error('❌ 下载失败:', error);
                        this.innerHTML = '❌ 下载失败';
                        alert('下载失败：' + error.message + '\n\n请检查网络连接或稍后重试。');
                    }

                    // 3秒后恢复按钮文本
                    setTimeout(() => {
                        this.innerHTML = originalText;
                    }, 3000);
                };

                // 添加悬停效果
                btn.addEventListener('mouseover', function() {
                    this.style.opacity = '0.8';
                });
                btn.addEventListener('mouseout', function() {
                    this.style.opacity = '1';
                });
            });

            // 绑定开始使用功能
            document.getElementById('start-using-btn').onclick = function() {
                document.querySelector('.payment-success-overlay').remove();
                window.location.href = '/tools/sight-reading-generator.html';
            };

        }).catch((error) => {
            console.error('❌ 创建支付成功界面失败:', error);
            // 降级处理：显示简单的成功提示
            alert('支付成功！访问码：' + accessCode);
        });

        console.log('✅ 新版支付成功界面已显示，访问码:', accessCode);
    };

    // 提供手动清理函数
    window.clearAllPaymentCache = function() {
        const sessionKeys = ['zpay-session', 'payment-session'];
        sessionKeys.forEach(key => localStorage.removeItem(key));
        removeAllPaymentOverlays();
        console.log('🧹 手动清理支付会话完成');
    };

    // 生成符合CloudBase规则的完全随机访问码
    function generateRandomAccessCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const length = Math.random() < 0.5 ? 11 : 12; // 随机11位或12位
        let code = '';

        for (let i = 0; i < length; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return code;
    }

    // 模拟CloudBase支付成功流程
    window.testUnifiedPayment = async function() {
        console.log('🧪 开始模拟CloudBase支付流程...');

        // 生成随机访问码
        const testCode = generateRandomAccessCode();
        console.log('🎫 生成模拟访问码:', testCode);

        window.showUnifiedPaymentSuccess(testCode, 'mobile-style-test');
    };

    // 强制清理并生成新随机码
    window.forceGenerateNewCode = function() {
        // 清理localStorage中的旧访问码
        localStorage.removeItem('ic-premium-access');
        console.log('🧹 已清理旧访问码');

        // 生成新的完全随机访问码
        const newCode = generateRandomAccessCode();
        console.log('🎲 生成新随机访问码:', newCode);
        window.showUnifiedPaymentSuccess(newCode, 'force-random-mobile');
    };

    console.log('✅ 新版支付处理器已初始化 (手机风格)');
    console.log('💡 可用函数: testUnifiedPayment(), forceGenerateNewCode()');
    console.log('🎯 全新手机风格界面，与提供的设计图保持一致');

})();