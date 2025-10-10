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
            autoFill: true,
            serverVerified: true // 支付成功后的访问码已验证
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
            const paymentAmount = orderData?.money || orderData?.amount || '1.00';

            const successHtml = `
              <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px; box-sizing: border-box;" id="modal-overlay">
            <div style="background: white; padding: 40px; border-radius: 16px; max-width: 500px; width: 90%; text-align: center; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3); max-height: 80vh; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;" id="modal-scroll-container">
                <div style="margin-bottom: 30px;">
                    <div style="width: 80px; height: 80px; background: #4CAF50; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 48px;">✓</div>
                    <h2 style="color: #333; margin-bottom: 10px;">🎉 访问验证成功！</h2>
                    <p style="color: #666; font-size: 16px; margin-bottom: 0;">您的访问码已验证，现在可以使用完整版功能</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 30px; text-align: left;">
                    <h3 style="color: #333; margin-bottom: 15px; text-align: center;">📋 验证信息</h3>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; align-items: center;">
                        <span style="color: #666;">访问码：</span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-family: monospace; font-weight: bold; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">${accessCode}</span>
                            <button onclick="copyAccessCode('${accessCode}')" 
                                    style="background: #3b82f6; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s ease;"
                                    onmouseover="this.style.background='#2563eb'"
                                    onmouseout="this.style.background='#3b82f6'"
                                    title="复制访问码">
                                📋
                            </button>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="color: #666;">产品：</span>
                        <span>${orderData.product_name || 'IC Studio 视奏工具'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="color: #666;">验证时间：</span>
                        <span>${new Date().toLocaleString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #666;">订单号：</span>
                        <span style="font-family: monospace; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">${(orderData.order_info?.out_trade_no) || (orderData.order_info?.order_id) || orderData.out_trade_no || orderData.order_id || orderData.orderId || '暂无'}</span>
                    </div>
                </div>

                <div style="margin-bottom: 30px;">
                    <h3 style="color: #333; margin-bottom: 20px;">📦 下载安装包</h3>
                    <div style="display: grid; gap: 10px;">
                        <button class="popup-download-btn" data-platform="windows-x64"
                               style="display: block; background: #f0f9ff; color: #1e40af; padding: 12px 20px; border: 2px solid #93c5fd; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all 0.3s ease; cursor: pointer; border: none; width: 100%;"
                               onmouseover="this.style.background='#1e40af'; this.style.color='white';" 
                               onmouseout="this.style.background='#f0f9ff'; this.style.color='#1e40af';">
                            💻 Windows x64 (73.2MB)
                        </button>
                        <button class="popup-download-btn" data-platform="macos-x64-dmg"
                               style="display: block; background: #f0fdf4; color: #166534; padding: 12px 20px; border: 2px solid #86efac; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all 0.3s ease; cursor: pointer; border: none; width: 100%;"
                               onmouseover="this.style.background='#166534'; this.style.color='white';" 
                               onmouseout="this.style.background='#f0fdf4'; this.style.color='#166534';">
                            🍎 macOS Intel (DMG - 86.2MB)
                        </button>
                        <button class="popup-download-btn" data-platform="macos-arm64-zip"
                               style="display: block; background: #fef3c7; color: #92400e; padding: 12px 20px; border: 2px solid #fbbf24; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all 0.3s ease; cursor: pointer; border: none; width: 100%;"
                               onmouseover="this.style.background='#92400e'; this.style.color='white';" 
                               onmouseout="this.style.background='#fef3c7'; this.style.color='#92400e';">
                            🍎 macOS Apple Silicon (ZIP - 86.6MB)
                        </button>
                        <button class="popup-download-btn" data-platform="linux-appimage"
                               style="display: block; background: #ede9fe; color: #6b21a8; padding: 12px 20px; border: 2px solid #c084fc; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all 0.3s ease; cursor: pointer; border: none; width: 100%;"
                               onmouseover="this.style.background='#6b21a8'; this.style.color='white';" 
                               onmouseout="this.style.background='#ede9fe'; this.style.color='#6b21a8';">
                            🐧 Linux (AppImage - 77.6MB)
                        </button>
                    </div>
                    <p style="font-size: 12px; color: #888; margin-top: 15px;">下载完成后，使用以上访问码激活完整版功能</p>
                </div>

                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button onclick="closeSuccessPopup()" 
                            style="padding: 15px 30px; background: #f8f9fa; color: #333; border: 2px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s ease;"
                            onmouseover="this.style.background='#e2e8f0'" 
                            onmouseout="this.style.background='#f8f9fa'">
                        稍后使用
                    </button>
                    <button onclick="goToSightReadingTool()" 
                            style="padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); transition: all 0.3s ease;"
                            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(102, 126, 234, 0.4)'" 
                            onmouseout="this.style.transform='translateY(0px)'; this.style.boxShadow='0 4px 15px rgba(102, 126, 234, 0.3)'">
                        开始使用
                    </button>
                </div>
            </div>
        </div>
    `;

            // 添加到页面
            document.body.insertAdjacentHTML('beforeend', successHtml);

            // 添加移动端触摸事件处理
            const scrollContainer = document.getElementById('modal-scroll-container');
            if (scrollContainer) {
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

                // 添加美化滚动条样式
                if (!document.getElementById('payment-success-scrollbar-styles')) {
                    const style = document.createElement('style');
                    style.id = 'payment-success-scrollbar-styles';
                    style.textContent = `
                        #modal-scroll-container::-webkit-scrollbar {
                            width: 6px;
                        }

                        #modal-scroll-container::-webkit-scrollbar-track {
                            background: rgba(0, 0, 0, 0.05);
                            border-radius: 3px;
                        }

                        #modal-scroll-container::-webkit-scrollbar-thumb {
                            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                            border-radius: 3px;
                            transition: all 0.3s ease;
                        }

                        #modal-scroll-container::-webkit-scrollbar-thumb:hover {
                            background: linear-gradient(135deg, #45a049 0%, #3d8b40 100%);
                            box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3);
                        }

                        #modal-scroll-container::-webkit-scrollbar-thumb:active {
                            background: linear-gradient(135deg, #3d8b40 0%, #2e7d32 100%);
                        }
                    `;
                    document.head.appendChild(style);
                }
            }

            return orderData;
        }

        // 添加缺失的全局函数
        window.closeSuccessPopup = function() {
            const overlay = document.querySelector('.payment-success-overlay, [style*="position: fixed"][style*="rgba(0, 0, 0, 0.7)"]');
            if (overlay) {
                overlay.remove();
                console.log('✅ 支付成功弹窗已关闭');
            }
        };

        window.goToSightReadingTool = function() {
            window.closeSuccessPopup();
            window.location.href = '/tools/melody-generator.html';
        };

        // 创建和显示界面
        createAndShowPaymentSuccess().then((orderData) => {
            // 绑定各个下载按钮的功能
            document.querySelectorAll('.popup-download-btn').forEach(btn => {
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

            console.log('✅ 所有下载按钮功能已绑定完成');

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