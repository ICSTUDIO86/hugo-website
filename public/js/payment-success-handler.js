/**
 * IC Studio - 统一支付处理器
 * 解决多支付处理器冲突问题
 */

(function() {
    'use strict';
    
    console.log('🎯 统一支付处理器启动...');
    
    // 1. 清理现有的支付成功界面（不清理localStorage）
    function removeAllPaymentOverlays() {
        const overlays = document.querySelectorAll('.payment-success-overlay, .payment-success');
        overlays.forEach(overlay => {
            overlay.remove();
            console.log('🗑️ 已移除旧的支付界面');
        });
    }
    
    // 2. 统一的支付成功处理函数 - 暴露到全局
    window.showUnifiedPaymentSuccess = function(accessCode, source = 'unified', orderInfo = null) {
        // 先移除任何现有的界面
        removeAllPaymentOverlays();
        
        // 保存访问码到localStorage
        const accessData = {
            code: accessCode,
            activatedAt: Date.now(),
            deviceId: 'unified-' + Date.now(),
            expiresAt: null,
            version: '3.0-unified',
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
            const orderNumber = orderData?.out_trade_no || '获取中...';
            const alipayAccount = orderData?.alipay_account || 
                                 orderData?.alipay_phone || 
                                 orderData?.alipay_email || 
                                 (orderData?.zpay_trade_no ? `交易号: ${orderData.zpay_trade_no.substring(0, 10)}...` : '通过FAQ找回');
            
            const successHtml = `
              <div class="payment-success-overlay" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
              ">
                <div class="payment-success" style="
                  background: #f8f9fa;
                  padding: 30px;
                  border-radius: 16px;
                  border: 3px solid #27ae60;
                  text-align: center;
                  max-width: 450px;
                  width: 95%;
                  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                ">
                  <h3 style="color: #27ae60; margin-bottom: 15px; font-size: 24px;">🎉 支付成功！</h3>
                  
                  <!-- 访问码信息 -->
                  <div style="
                    background: #fff;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 20px 0;
                    border: 2px dashed #27ae60;
                  ">
                    <p style="margin: 5px 0; font-weight: bold; font-size: 16px;">您的专属访问码：</p>
                    <p id="access-code-display" style="
                      font-family: monospace;
                      font-size: 20px;
                      color: #2c3e50;
                      font-weight: bold;
                      letter-spacing: 2px;
                      margin: 15px 0;
                    ">${accessCode}</p>
                    <button id="copy-access-code-btn" style="
                      margin: 10px 5px;
                      padding: 10px 20px;
                      background: #667eea;
                      color: white;
                      border: none;
                      border-radius: 6px;
                      cursor: pointer;
                      font-weight: 600;
                      font-size: 14px;
                      transition: all 0.3s ease;
                    ">
                      📋 复制访问码
                    </button>
                  </div>
                  
                  <!-- 订单和支付宝信息 -->
                  <div style="
                    background: #fff;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 15px 0;
                    border: 1px solid #e9ecef;
                    text-align: left;
                  ">
                    <div style="margin-bottom: 10px;">
                      <span style="font-weight: bold; color: #2c3e50;">📋 订单号：</span>
                      <span style="font-family: monospace; font-size: 12px; color: #666;">${orderNumber}</span>
                    </div>
                    <div style="margin-bottom: 10px;">
                      <span style="font-weight: bold; color: #2c3e50;">💳 支付宝：</span>
                      <span style="font-size: 12px; color: #666;">${alipayAccount}</span>
                    </div>
                  </div>
                  
                  <!-- 安装包下载 -->
                  <div style="
                    background: #e8f4f8;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 15px 0;
                    border: 1px solid #17a2b8;
                  ">
                    <p style="margin: 5px 0; font-weight: bold; font-size: 14px; color: #17a2b8;">
                      📦 安装包下载
                    </p>
                    <div id="download-section">
                      <button id="show-download-options-btn" style="
                        margin: 10px 5px;
                        padding: 12px 20px;
                        background: #17a2b8;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 14px;
                        transition: all 0.3s ease;
                        width: 100%;
                      ">
                        💻 选择安装包
                      </button>
                      
                      <!-- 下载选项面板（初始隐藏） -->
                      <div id="download-options-panel" style="display: none; margin-top: 10px;">
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: left;">
                          <p style="font-weight: bold; font-size: 13px; margin: 0 0 10px 0; color: #495057;">
                            请选择您的操作系统：
                          </p>
                          
                          <!-- Windows -->
                          <div style="margin-bottom: 12px;">
                            <p style="font-weight: bold; font-size: 12px; margin: 0 0 5px 0; color: #dc3545;">
                              🖥️ Windows
                            </p>
                            <button class="download-btn" data-platform="windows-exe" style="
                              margin: 2px 5px 2px 0;
                              padding: 8px 12px;
                              background: #dc3545;
                              color: white;
                              border: none;
                              border-radius: 4px;
                              cursor: pointer;
                              font-size: 11px;
                              font-weight: 500;
                            ">
                              标准版 (140.9MB)
                            </button>
                            <button class="download-btn" data-platform="windows-x64" style="
                              margin: 2px 5px 2px 0;
                              padding: 8px 12px;
                              background: #dc3545;
                              color: white;
                              border: none;
                              border-radius: 4px;
                              cursor: pointer;
                              font-size: 11px;
                              font-weight: 500;
                            ">
                              优化版 (73.2MB)
                            </button>
                          </div>
                          
                          <!-- macOS -->
                          <div style="margin-bottom: 12px;">
                            <p style="font-weight: bold; font-size: 12px; margin: 0 0 5px 0; color: #6f42c1;">
                              🍎 macOS
                            </p>
                            <button class="download-btn" data-platform="macos-x64-dmg" style="
                              margin: 2px 5px 2px 0;
                              padding: 8px 12px;
                              background: #6f42c1;
                              color: white;
                              border: none;
                              border-radius: 4px;
                              cursor: pointer;
                              font-size: 11px;
                              font-weight: 500;
                            ">
                              Intel (DMG)
                            </button>
                            <button class="download-btn" data-platform="macos-x64-zip" style="
                              margin: 2px 5px 2px 0;
                              padding: 8px 12px;
                              background: #6f42c1;
                              color: white;
                              border: none;
                              border-radius: 4px;
                              cursor: pointer;
                              font-size: 11px;
                              font-weight: 500;
                            ">
                              Intel (ZIP)
                            </button>
                            <button class="download-btn" data-platform="macos-arm64-zip" style="
                              margin: 2px 5px 2px 0;
                              padding: 8px 12px;
                              background: #6f42c1;
                              color: white;
                              border: none;
                              border-radius: 4px;
                              cursor: pointer;
                              font-size: 11px;
                              font-weight: 500;
                            ">
                              M1/M2/M3 (ZIP)
                            </button>
                          </div>
                          
                          <!-- Linux -->
                          <div style="margin-bottom: 8px;">
                            <p style="font-weight: bold; font-size: 12px; margin: 0 0 5px 0; color: #fd7e14;">
                              🐧 Linux
                            </p>
                            <button class="download-btn" data-platform="linux-deb" style="
                              margin: 2px 5px 2px 0;
                              padding: 8px 12px;
                              background: #fd7e14;
                              color: white;
                              border: none;
                              border-radius: 4px;
                              cursor: pointer;
                              font-size: 11px;
                              font-weight: 500;
                            ">
                              DEB包 (70.3MB)
                            </button>
                            <button class="download-btn" data-platform="linux-appimage" style="
                              margin: 2px 5px 2px 0;
                              padding: 8px 12px;
                              background: #fd7e14;
                              color: white;
                              border: none;
                              border-radius: 4px;
                              cursor: pointer;
                              font-size: 11px;
                              font-weight: 500;
                            ">
                              AppImage (77.6MB)
                            </button>
                          </div>
                          
                          <p style="font-size: 10px; color: #6c757d; margin: 8px 0 0 0; line-height: 1.3;">
                            💡 <strong>芯片选择说明：</strong><br>
                            • Intel 芯片 Mac 选择 x64 版本<br>
                            • Apple Silicon (M1/M2/M3) 选择 arm64 版本
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- 温馨提示 -->
                  <div id="tip-section" style="
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 15px 0;
                    border: 1px solid #e9ecef;
                  ">
                    <p style="margin: 5px 0; font-weight: bold; font-size: 14px; color: #2c3e50;">
                      💡 温馨提示
                    </p>
                    <p style="margin: 5px 0; font-size: 12px; color: #666; line-height: 1.4;">
                      • 访问码已自动保存到您的设备<br>
                      • 如需在其他设备使用，请复制保存访问码<br>
                      • 遗失访问码可通过网站FAQ找回
                    </p>
                  </div>
                  
                  <div style="margin-top: 20px;">
                    <button id="start-using-btn" style="
                      display: inline-block;
                      background: #667eea;
                      color: white;
                      padding: 12px 25px;
                      border: none;
                      border-radius: 8px;
                      cursor: pointer;
                      font-weight: 600;
                      font-size: 16px;
                      transition: all 0.3s ease;
                      width: 200px;
                    ">
                      🎯 开始使用
                    </button>
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
            // 绑定复制功能
            document.getElementById('copy-access-code-btn').onclick = function() {
                navigator.clipboard.writeText(accessCode).then(() => {
                    const btn = this;
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '✅ 已复制！';
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                    }, 2000);
                }).catch(() => {
                    // 降级方案
                    const codeElement = document.getElementById('access-code-display');
                    const range = document.createRange();
                    range.selectNodeContents(codeElement);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                });
            };
            
            // 绑定显示下载选项按钮
            document.getElementById('show-download-options-btn').onclick = function() {
                const panel = document.getElementById('download-options-panel');
                const btn = this;
                
                if (panel.style.display === 'none') {
                    panel.style.display = 'block';
                    btn.innerHTML = '📦 收起选项';
                } else {
                    panel.style.display = 'none';
                    btn.innerHTML = '💻 选择安装包';
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
                            
                            // 显示下载信息
                            const tipSection = document.getElementById('tip-section');
                            if (tipSection) {
                                tipSection.innerHTML = `
                                    <p style="margin: 5px 0; font-weight: bold; font-size: 14px; color: #28a745;">
                                        ✅ 下载已开始
                                    </p>
                                    <p style="margin: 5px 0; font-size: 12px; color: #666; line-height: 1.4;">
                                        • 正在下载：${result.data.package_info.name}<br>
                                        • 文件大小：${result.data.package_info.size}<br>
                                        • 下载链接有效期：24小时<br>
                                        • 如下载失败，请刷新页面重试
                                    </p>
                                `;
                            }
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
            });
            
            // 绑定开始使用功能
            document.getElementById('start-using-btn').onclick = function() {
                document.querySelector('.payment-success-overlay').remove();
                window.location.href = '/tools/sight-reading-generator.html';
            };
            
            // 自动尝试收集支付信息（后台静默执行）
            setTimeout(async () => {
                try {
                    console.log('🔄 尝试自动分析支付数据...');
                    const response = await fetch('https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/autoExtractAlipayAccount', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Request-Source': 'IC-Studio-Auto-Extract'
                        },
                        body: JSON.stringify({
                            access_code: accessCode,
                            timestamp: new Date().toISOString(),
                            source: 'payment_success_auto'
                        })
                    });
                    
                    const result = await response.json();
                    console.log('🔍 自动分析结果:', result);
                    
                    if (result.success) {
                        console.log('✅ 支付数据分析完成，用户可通过FAQ找回访问码');
                    } else {
                        console.log('⚠️ 自动分析失败，用户仍可通过FAQ找回访问码');
                    }
                } catch (error) {
                    console.log('⚠️ 自动分析过程出错:', error);
                    // 静默失败，不影响用户体验
                }
            }, 1000);
            
        }).catch((error) => {
            console.error('❌ 创建支付成功界面失败:', error);
            // 降级处理：显示简单的成功提示
            alert('支付成功！访问码：' + accessCode);
        });
        
        console.log('✅ 统一支付成功界面已显示，访问码:', accessCode);
    };
    
    // 3. 提供手动清理函数
    window.clearAllPaymentCache = function() {
        // 仅清理支付会话相关的缓存，不清理访问码
        const sessionKeys = ['zpay-session', 'payment-session'];
        sessionKeys.forEach(key => localStorage.removeItem(key));
        removeAllPaymentOverlays();
        console.log('🧹 手动清理支付会话完成');
    };
    
    // 4. 生成符合CloudBase规则的完全随机访问码
    function generateRandomAccessCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const length = Math.random() < 0.5 ? 11 : 12; // 随机11位或12位
        let code = '';
        
        for (let i = 0; i < length; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return code;
    }
    
    // 5. 模拟CloudBase支付成功流程
    window.testUnifiedPayment = async function() {
        console.log('🧪 开始模拟CloudBase支付流程...');
        
        // 生成随机访问码
        const testCode = generateRandomAccessCode();
        console.log('🎫 生成模拟访问码:', testCode);
        
        try {
            // 模拟CloudBase API调用生成访问码
            if (window.cloudbaseAPI) {
                // 直接调用生成函数（跳过实际支付验证）
                const mockPaymentData = {
                    orderId: 'TEST_' + Date.now(),
                    paymentMethod: 'mock',
                    amount: '9.99',
                    merchantId: 'test',
                    transactionId: 'mock_' + Date.now()
                };
                
                const result = await window.cloudbaseAPI.generateAccessCode(mockPaymentData);
                
                if (result.success) {
                    console.log('✅ 模拟CloudBase生成成功:', result.accessCode);
                    window.showUnifiedPaymentSuccess(result.accessCode, 'cloudbase-test');
                } else {
                    console.log('❌ CloudBase生成失败，使用本地测试码');
                    window.showUnifiedPaymentSuccess(testCode, 'local-fallback');
                }
            } else {
                console.log('⚠️ CloudBase API未初始化，使用本地测试');
                window.showUnifiedPaymentSuccess(testCode, 'manual-test');
            }
        } catch (error) {
            console.error('❌ 模拟支付错误:', error);
            window.showUnifiedPaymentSuccess(testCode, 'error-fallback');
        }
    };
    
    // 6. 强制清理并生成新随机码
    window.forceGenerateNewCode = function() {
        // 清理localStorage中的旧访问码
        localStorage.removeItem('ic-premium-access');
        console.log('🧹 已清理旧访问码');
        
        // 生成新的完全随机访问码
        const newCode = generateRandomAccessCode();
        console.log('🎲 生成新随机访问码:', newCode);
        window.showUnifiedPaymentSuccess(newCode, 'force-random');
    };
    
    console.log('✅ 统一支付处理器已初始化');
    console.log('💡 可用函数: clearAllPaymentCache(), testUnifiedPayment()');
    console.log('🎯 所有支付处理器现在都委托给 window.showUnifiedPaymentSuccess');
    
})();