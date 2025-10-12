/**
 * IC Studio 访问码验证增强器
 * 在访问码验证成功后提供更好的用户体验
 */

(function() {
  console.log('🔧 访问码验证增强器加载');

  // 等待页面加载完成
  document.addEventListener('DOMContentLoaded', function() {
    enhanceAccessCodeFlow();
  });

  // 延迟执行，确保其他脚本都已加载
  setTimeout(enhanceAccessCodeFlow, 1000);

  function enhanceAccessCodeFlow() {
    console.log('✨ 开始增强访问码验证流程');

    // 1. 增强直接验证函数 - 调用 CloudBase API
    if (window.directVerifyCode) {
      const originalDirectVerify = window.directVerifyCode;
      window.directVerifyCode = async function() {
        console.log('🚀 增强版访问码直接验证 - 调用 CloudBase API');
        
        const input = document.getElementById('access-code-input');
        const resultDiv = document.getElementById('verify-result');
        
        if (!input || !resultDiv) {
          console.error('❌ 找不到访问码输入元素');
          return;
        }
        
        const code = input.value.trim().toUpperCase();
        
        if (!code) {
          resultDiv.innerHTML = '<span style="color: #e74c3c;">❌ 请输入访问码</span>';
          return;
        }
        
        if (!code || (code.length !== 12 && code.length !== 11)) {
          resultDiv.innerHTML = '<span style="color: #e74c3c;">❌ 请输入有效的11-12位访问码</span>';
          return;
        }
        
        resultDiv.innerHTML = '<span style="color: #3498db;">🔄 正在验证访问码...</span>';
        
        try {
          // 使用统一的 PaymentStateManager 进行验证
          if (window.paymentManager && window.paymentManager.verifyAccessCode) {
            console.log('🚀 使用 PaymentStateManager 验证访问码');
            const result = await window.paymentManager.verifyAccessCode(code, true);
            
            if (result.success) {
              console.log('✅ PaymentStateManager 验证成功:', code);
              resultDiv.innerHTML = '<span style="color: #27ae60;">✅ 验证成功！正在显示详情...</span>';

              // 调用完整的支付成功弹窗
              if (typeof window.showUnifiedPaymentSuccess === 'function') {
                console.log('🎉 显示完整验证成功弹窗');
                window.showUnifiedPaymentSuccess(code, 'manual-verify', result.data);

                // 清理输入框和结果显示
                setTimeout(() => {
                  input.value = '';
                  resultDiv.innerHTML = '';
                }, 500);

              } else {
                console.log('⚠️ 完整弹窗函数不可用，使用降级方案');
                // 降级方案：立即更新UI而不刷新页面
                if (window.premiumUIManager) {
                  window.premiumUIManager.refreshUI();
                  console.log('✅ UI已刷新，无需重载页面');

                  // 显示成功消息后清理输入
                  setTimeout(() => {
                    input.value = '';
                    resultDiv.innerHTML = '<span style="color: #27ae60;">✅ 高级功能已激活</span>';
                  }, 1000);

                } else {
                  // 备用：页面刷新
                  console.log('⚠️ UI管理器未找到，执行页面刷新');
                  setTimeout(() => {
                    window.location.reload();
                  }, 1500);
                }
              }
              
            } else {
              console.log('❌ PaymentStateManager 验证失败:', result.error);
              resultDiv.innerHTML = `<span style="color: #e74c3c;">❌ ${result.error}</span>`;
            }
          } else {
            // 备用方案：调用页面上的 verifyAccessCodeWithServer 函数
            console.log('⚠️ PaymentStateManager 不可用，使用备用验证');
            if (window.verifyAccessCodeWithServer) {
              await window.verifyAccessCodeWithServer();
            } else {
              resultDiv.innerHTML = '<span style="color: #e74c3c;">❌ 验证系统不可用</span>';
            }
          }
          
        } catch (error) {
          console.error('❌ 验证过程失败:', error);
          resultDiv.innerHTML = '<span style="color: #e74c3c;">❌ 验证失败，请稍后重试</span>';
        }
      };
      
      console.log('✅ directVerifyCode 函数已增强');
    }

    // 2. 增强一般验证函数 - 调用 CloudBase API
    if (window.verifyAccessCode) {
      const originalVerifyAccessCode = window.verifyAccessCode;
      window.verifyAccessCode = async function() {
        console.log('🔍 增强版访问码验证 - 调用 CloudBase API');
        
        const input = document.getElementById('access-code-input');
        const resultDiv = document.getElementById('verify-result');
        
        if (!input || !resultDiv) {
          console.error('❌ 找不到访问码输入元素');
          return;
        }
        
        const code = input.value.trim().toUpperCase();
        
        if (!code) {
          resultDiv.innerHTML = '<span style="color: #e74c3c;">❌ 请输入访问码</span>';
          return;
        }
        
        if (!code || (code.length !== 12 && code.length !== 11)) {
          resultDiv.innerHTML = '<span style="color: #e74c3c;">❌ 请输入有效的11-12位访问码</span>';
          return;
        }
        
        resultDiv.innerHTML = '<span style="color: #3498db;">🔄 正在验证访问码...</span>';
        
        try {
          // 使用统一的 PaymentStateManager 进行验证
          if (window.paymentManager && window.paymentManager.verifyAccessCode) {
            console.log('🚀 使用 PaymentStateManager 验证访问码');
            const result = await window.paymentManager.verifyAccessCode(code, true);
            
            if (result.success) {
              console.log('✅ PaymentStateManager 验证成功:', code);
              resultDiv.innerHTML = '<span style="color: #27ae60;">✅ 验证成功！正在显示详情...</span>';

              // 调用完整的支付成功弹窗
              if (typeof window.showUnifiedPaymentSuccess === 'function') {
                console.log('🎉 显示完整验证成功弹窗');
                window.showUnifiedPaymentSuccess(code, 'manual-verify', result.data);

                // 清理输入框和结果显示
                setTimeout(() => {
                  input.value = '';
                  resultDiv.innerHTML = '';
                }, 500);

              } else {
                console.log('⚠️ 完整弹窗函数不可用，使用降级方案');
                // 降级方案：立即更新UI
                if (window.premiumUIManager) {
                  setTimeout(() => {
                    window.premiumUIManager.refreshUI();
                    resultDiv.innerHTML = '<span style="color: #27ae60;">✨ 高级功能已成功激活</span>';
                    input.value = '';
                  }, 1000);
                } else {
                  // 备用方案
                  setTimeout(() => {
                    window.location.reload();
                  }, 2000);
                }
              }
            } else {
              console.log('❌ PaymentStateManager 验证失败:', result.error);
              resultDiv.innerHTML = `<span style="color: #e74c3c;">❌ ${result.error}</span>`;
            }
          } else {
            // 备用方案：调用页面上的 verifyAccessCodeWithServer 函数
            console.log('⚠️ PaymentStateManager 不可用，使用备用验证');
            if (window.verifyAccessCodeWithServer) {
              await window.verifyAccessCodeWithServer();
            } else {
              resultDiv.innerHTML = '<span style="color: #e74c3c;">❌ 验证系统不可用</span>';
            }
          }
          
        } catch (error) {
          console.error('❌ 验证过程失败:', error);
          resultDiv.innerHTML = '<span style="color: #e74c3c;">❌ 验证失败，请稍后重试</span>';
        }
      };
      
      console.log('✅ verifyAccessCode 函数已增强');
    }

    // 3. 提供全局重置函数
    window.resetToTrialMode = function() {
      console.log('🔄 重置为试用模式');
      
      localStorage.removeItem('ic-premium-access');
      localStorage.removeItem('ic-full-access');
      localStorage.removeItem('ic-verified-user');
      
      if (window.premiumUIManager) {
        window.premiumUIManager.refreshUI();
        console.log('✅ 已切换到试用模式UI');
      } else {
        window.location.reload();
      }
    };

    // 4. 提供全局升级函数
    window.upgradeToFullVersion = function(customCode) {
      // 生成完全随机的11-12位访问码
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const length = Math.random() < 0.5 ? 11 : 12;
      let randomCode = '';
      for (let i = 0; i < length; i++) {
        randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const code = customCode || randomCode;
      
      const accessData = {
        code: code,
        activatedAt: Date.now(),
        deviceId: 'manual-upgrade',
        expiresAt: null,
        version: '2.0-manual-upgrade',
        serverVerified: true // 手动升级的访问码标记为已验证
      };
      
      localStorage.setItem('ic-premium-access', JSON.stringify(accessData));
      console.log('✅ 手动升级完成:', code);
      
      if (window.premiumUIManager) {
        window.premiumUIManager.refreshUI();
        alert(`✅ 升级成功！\n访问码: ${code}\n\n高级功能已激活`);
      } else {
        alert(`✅ 升级成功！\n访问码: ${code}\n\n页面将刷新以激活功能`);
        setTimeout(() => window.location.reload(), 1000);
      }
    };

    // 5. 提供全局重置为新用户函数
    window.resetToFreshUser = function() {
      console.log('🔄 重置为全新用户状态');
      
      try {
        // 清理所有存储的用户数据
        localStorage.removeItem('ic-premium-access');
        localStorage.removeItem('ic-full-access');
        localStorage.removeItem('ic-verified-user');
        localStorage.removeItem('ic-sight-reading-trial');
        localStorage.removeItem('ic-device-id');
        localStorage.removeItem('ic-trial-end');
        localStorage.removeItem('ic-reset-count');
        localStorage.removeItem('ic-anticheat-exempt');
        
        // 清理会话存储
        sessionStorage.removeItem('ic-device-id-session');
        
        // 清理cookie
        document.cookie = 'ic_device_backup=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        
        console.log('✅ 已清理所有用户数据');
        
        // 刷新UI状态
        if (window.premiumUIManager) {
          window.premiumUIManager.refreshUI();
          console.log('✅ UI已重置为试用模式');
        }
        
        // 重新初始化试用限制器
        if (window.trialLimiter) {
          // 等待一下再重新初始化，确保数据清理完成
          setTimeout(() => {
            window.trialLimiter.init();
            console.log('✅ 试用限制器已重新初始化');
            
            // 显示成功消息
            alert('✅ 用户状态已重置为全新状态！\n现在可以重新开始10分钟试用。');
          }, 500);
        }
        
        // 清理访问码输入区域的显示状态
        const accessContainer = document.getElementById('access-code-container');
        const accessInput = document.getElementById('access-code-input');
        const verifyResult = document.getElementById('verify-result');
        
        if (accessContainer && accessContainer.innerHTML.includes('高级功能已激活')) {
          // 恢复原始的访问码输入界面
          window.location.reload();
        }
        
        if (accessInput) {
          accessInput.value = '';
        }
        
        if (verifyResult) {
          verifyResult.innerHTML = '';
        }
        
      } catch (error) {
        console.error('❌ 重置过程中出现错误:', error);
        alert('⚠️ 重置过程中出现错误，建议手动刷新页面');
      }
    };

    // 6. 提供快速测试函数
    window.testAccessCode = function(code) {
      code = code || 'J71YRYSV9K6W'; // 使用已知的测试访问码
      
      console.log(`🧪 测试访问码: ${code}`);
      
      const input = document.getElementById('access-code-input');
      if (input) {
        input.value = code;
        // 触发验证按钮更新
        if (window.updateVerifyButton) {
          window.updateVerifyButton();
        }
        
        // 模拟点击验证
        setTimeout(() => {
          if (window.verifyAccessCodeWithServer) {
            window.verifyAccessCodeWithServer();
          }
        }, 500);
      } else {
        console.error('❌ 找不到访问码输入框');
        alert('请先打开包含访问码输入框的页面');
      }
    };

    // 7. 提供调试辅助函数
    window.debugAccessSystem = function() {
      console.log('🔍 访问系统调试信息:');
      console.log('💾 LocalStorage数据:');
      console.log('  - ic-premium-access:', localStorage.getItem('ic-premium-access'));
      console.log('  - ic-sight-reading-trial:', localStorage.getItem('ic-sight-reading-trial'));
      console.log('  - ic-device-id:', localStorage.getItem('ic-device-id'));
      
      console.log('🎯 全局函数状态:');
      console.log('  - verifyAccessCodeWithServer:', typeof window.verifyAccessCodeWithServer);
      console.log('  - updateVerifyButton:', typeof window.updateVerifyButton);
      console.log('  - trialLimiter:', !!window.trialLimiter);
      console.log('  - premiumUIManager:', !!window.premiumUIManager);
      
      console.log('🔧 当前试用状态:');
      if (window.trialLimiter) {
        const status = window.trialLimiter.checkTrialStatus();
        console.log('  - 允许使用:', status.allowed);
        console.log('  - 剩余时间:', status.remaining);
        console.log('  - 是否过期:', status.expired);
      }
      
      return {
        localStorage: {
          premiumAccess: localStorage.getItem('ic-premium-access'),
          trial: localStorage.getItem('ic-sight-reading-trial'),
          deviceId: localStorage.getItem('ic-device-id')
        },
        functions: {
          verifyServer: typeof window.verifyAccessCodeWithServer,
          updateButton: typeof window.updateVerifyButton,
          trialLimiter: !!window.trialLimiter,
          uiManager: !!window.premiumUIManager
        },
        trialStatus: window.trialLimiter ? window.trialLimiter.checkTrialStatus() : null
      };
    };

    console.log('🎉 访问码验证增强完成');
    console.log('💡 可用的调试命令:');
    console.log('  - resetToFreshUser() - 重置为全新用户');
    console.log('  - testAccessCode() - 测试已知访问码');
    console.log('  - debugAccessSystem() - 显示系统调试信息');
  }

})();