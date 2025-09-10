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
    window.showUnifiedPaymentSuccess = function(accessCode, source = 'unified') {
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
        
        // 创建统一的专业界面
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
              max-width: 400px;
              width: 90%;
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            ">
              <h3 style="color: #27ae60; margin-bottom: 15px; font-size: 24px;">🎉 支付成功！</h3>
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
              <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
                请保存好此访问码，以便你可以在别的设备上使用产品。 
              </p>
              
              <!-- 支付宝账号收集表单 -->
              <div id="account-collection-form" style="
                background: #fff;
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
                border: 1px solid #e0e0e0;
              ">
                <p style="margin: 5px 0; font-weight: bold; font-size: 14px; color: #2c3e50;">
                  📱 为方便将来找回访问码，请提供您的支付宝账号：
                </p>
                <input type="text" id="alipay-account-input" placeholder="手机号或邮箱" style="
                  width: 100%;
                  padding: 8px 12px;
                  margin: 10px 0;
                  border: 1px solid #ddd;
                  border-radius: 4px;
                  font-size: 14px;
                  box-sizing: border-box;
                ">
                <input type="text" id="phone-input" placeholder="手机号（可选）" style="
                  width: 100%;
                  padding: 8px 12px;
                  margin: 5px 0;
                  border: 1px solid #ddd;
                  border-radius: 4px;
                  font-size: 14px;
                  box-sizing: border-box;
                ">
                <button id="save-account-btn" style="
                  width: 100%;
                  margin: 10px 0 5px 0;
                  padding: 8px 15px;
                  background: #27ae60;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 12px;
                  transition: all 0.3s ease;
                ">
                  💾 保存账号信息
                </button>
                <p style="font-size: 11px; color: #999; margin: 5px 0 0 0; text-align: center;">
                  * 此信息仅用于访问码找回，我们承诺保护您的隐私
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
                ">
                  开始使用
                </button>
                <button id="skip-account-btn" style="
                  display: inline-block;
                  background: #95a5a6;
                  color: white;
                  padding: 12px 25px;
                  border: none;
                  border-radius: 8px;
                  cursor: pointer;
                  font-weight: 600;
                  font-size: 16px;
                  margin-left: 10px;
                  transition: all 0.3s ease;
                ">
                  跳过
                </button>
              </div>
            </div>
          </div>
        `;

        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', successHtml);
        
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
        
        // 绑定保存账号功能
        document.getElementById('save-account-btn').onclick = async function() {
            const alipayAccountInput = document.getElementById('alipay-account-input');
            const phoneInput = document.getElementById('phone-input');
            const saveBtn = this;
            
            const alipayAccount = alipayAccountInput.value.trim();
            const phone = phoneInput.value.trim();
            
            if (!alipayAccount) {
                alert('请输入支付宝账号（手机号或邮箱）');
                alipayAccountInput.focus();
                return;
            }
            
            // 验证支付宝账号格式
            const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            const phonePattern = /^1[3-9]\d{9}$/;
            
            if (!emailPattern.test(alipayAccount) && !phonePattern.test(alipayAccount)) {
                alert('请输入有效的邮箱地址或手机号');
                alipayAccountInput.focus();
                return;
            }
            
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '💾 保存中...';
            saveBtn.disabled = true;
            
            try {
                // 调用云函数收集账号信息
                const response = await fetch('https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/collectUserAccount', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Request-Source': 'IC-Studio-Payment-Success'
                    },
                    body: JSON.stringify({
                        action: 'collect',
                        alipay_account: alipayAccount,
                        access_code: accessCode,
                        phone: phone || null,
                        timestamp: new Date().toISOString()
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    saveBtn.innerHTML = '✅ 已保存！';
                    saveBtn.style.background = '#27ae60';
                    
                    // 隐藏表单
                    document.getElementById('account-collection-form').style.display = 'none';
                    
                    console.log('✅ 用户账号信息已保存:', result);
                } else {
                    throw new Error(result.error || '保存失败');
                }
            } catch (error) {
                console.error('❌ 保存账号信息失败:', error);
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
                alert('保存失败，请稍后重试。您仍可以正常使用产品。');
            }
        };
        
        // 绑定跳过功能
        document.getElementById('skip-account-btn').onclick = function() {
            // 隐藏表单
            document.getElementById('account-collection-form').style.display = 'none';
            console.log('ℹ️ 用户选择跳过账号收集');
        };
        
        // 绑定开始使用功能
        document.getElementById('start-using-btn').onclick = function() {
            document.querySelector('.payment-success-overlay').remove();
            window.location.href = '/tools/sight-reading-generator.html';
        };
        
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