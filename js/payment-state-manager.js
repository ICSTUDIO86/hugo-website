/**
 * IC Studio 付款状态管理器
 * 解决验证不一致和状态持久化问题
 */

class PaymentStateManager {
    constructor() {
        this.storageKeys = {
            paymentState: 'ic-studio-payment-state',
            accessCodes: 'ic-studio-access-codes',
            premiumAccess: 'ic-premium-access'
        };
        
        this.apiUrl = 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/verify-access-code';
        this.bundleApiUrl = 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/verifyBundleAccessCode';
        this.debugMode = localStorage.getItem('ic-debug-mode') === 'true';
        
        this.log('PaymentStateManager 初始化完成');
        this.initializeState();
    }
    
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleString();
        const prefix = '[PaymentStateManager]';
        const colors = {
            info: 'color: #3498db',
            success: 'color: #27ae60', 
            error: 'color: #e74c3c',
            warning: 'color: #f39c12'
        };
        
        if (this.debugMode) {
            console.log(`%c${prefix} [${timestamp}] ${message}`, colors[type] || colors.info);
        }
    }
    
    // 初始化状态，检查是否有已支付的访问码
    initializeState() {
        const savedState = this.getPaymentState();
        
        if (savedState && savedState.hasPaid && savedState.accessCode) {
            this.log(`发现已保存的支付状态，访问码: ${savedState.accessCode}`, 'success');
            
            // 等待DOM加载完成后再验证和显示状态
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.verifyStoredAccessCode(savedState.accessCode);
                });
            } else {
                // DOM已经加载完成，稍微延迟确保所有元素都渲染完成
                setTimeout(() => {
                    this.verifyStoredAccessCode(savedState.accessCode);
                }, 500);
            }
        } else {
            this.log('未发现已保存的支付状态');
        }
    }
    
    // 获取保存的支付状态
    getPaymentState() {
        try {
            const state = localStorage.getItem(this.storageKeys.paymentState);
            return state ? JSON.parse(state) : null;
        } catch (e) {
            this.log(`读取支付状态失败: ${e.message}`, 'error');
            return null;
        }
    }
    
    // 保存支付状态
    savePaymentState(accessCode, orderInfo = null) {
        const paymentState = {
            hasPaid: true,
            accessCode: accessCode,
            paidAt: new Date().toISOString(),
            orderInfo: orderInfo,
            version: '2.0'
        };
        
        try {
            localStorage.setItem(this.storageKeys.paymentState, JSON.stringify(paymentState));
            this.log(`支付状态已保存: ${accessCode}`, 'success');
            return true;
        } catch (e) {
            this.log(`保存支付状态失败: ${e.message}`, 'error');
            return false;
        }
    }
    
    // 改进的访问码验证（统一逻辑）
    async verifyAccessCode(accessCode, fromInput = false) {
        this.log(`开始验证访问码: ${accessCode}`);
        
        if (!accessCode) {
            return { success: false, error: '访问码不能为空' };
        }
        
        // 格式检查
        if (!/^[A-Z0-9]{6,30}$/.test(accessCode)) {
            return { success: false, error: '访问码格式不正确（应为6-30位字母数字）' };
        }

        const isBundleCode = this.isBundleAccessCode(accessCode);
        const endpoint = isBundleCode ? this.bundleApiUrl : this.apiUrl;
        
        try {
            const requestBody = {
                code: accessCode,
                deviceId: this.getDeviceId(),
                source: fromInput ? 'user_input' : 'auto_verify'
            };
            
            this.log(`发送API请求: ${JSON.stringify(requestBody)}`);
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Request-Source': 'IC-Studio-PaymentManager',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify(requestBody)
            });
            
            this.log(`API响应状态: ${response.status}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            this.log(`API响应内容: ${JSON.stringify(result)}`);
            
            const normalized = this.normalizeVerifyResult(result, isBundleCode);
            
            if (normalized.success) {
                if (isBundleCode && window.BundlePayment && typeof window.BundlePayment.persistBundleAccess === 'function') {
                    window.BundlePayment.persistBundleAccess(accessCode, normalized.data);
                } else if (isBundleCode) {
                    this.persistBundleFallback(accessCode, normalized.data);
                } else {
                    this.savePaymentState(accessCode, normalized.data.order_info);
                    this.activatePremiumAccess(accessCode, normalized.data);
                }
                
                return {
                    success: true,
                    data: normalized.data,
                    message: '验证成功'
                };
            } else {
                return {
                    success: false,
                    error: normalized.error
                };
            }
            
        } catch (error) {
            this.log(`验证请求失败: ${error.message}`, 'error');
            return {
                success: false,
                error: `网络错误: ${error.message}`
            };
        }
    }

    isBundleAccessCode(accessCode) {
        return /^BDL[A-Z0-9]{3,27}$/i.test(String(accessCode || '').trim());
    }

    normalizeVerifyResult(result, isBundleCode) {
        if (!isBundleCode) {
            if (result && result.success && result.data) {
                return { success: true, data: result.data };
            }
            return {
                success: false,
                error: (result && (result.message || result.error)) || '访问码无效'
            };
        }

        if (result && result.valid === true && result.ok === true) {
            return {
                success: true,
                data: {
                    product_name: result.product_name || 'IC Studio 套装（Cognote + FretLab）',
                    amount: result.amount || '168.00',
                    order_info: result.order_info || null,
                    tool_id: result.tool_id || 'bundle',
                    unlock_tools: result.unlock_tools || ['cognote', 'fretlab'],
                    out_trade_no: result.out_trade_no || null
                }
            };
        }

        return {
            success: false,
            error: (result && (result.msg || result.message || result.error)) || '访问码无效'
        };
    }

    persistBundleFallback(accessCode, data) {
        const now = Date.now();
        const safeCode = String(accessCode || '').trim().toUpperCase();
        if (!safeCode) return;

        try {
            localStorage.setItem('ic-bundle-license-v1', JSON.stringify({
                version: 1,
                toolId: 'bundle',
                code: safeCode,
                verifiedAt: now,
                order: data && data.order_info ? data.order_info : null,
                unlockTools: ['cognote', 'fretlab']
            }));
            localStorage.setItem('ic-fretlab-access', safeCode);
            localStorage.setItem('ic-fretlab-license-v1', JSON.stringify({
                version: 1,
                toolId: 'fretlab',
                code: safeCode,
                verifiedAt: now,
                order: data && data.order_info ? data.order_info : null
            }));
        } catch (_) {}

        this.savePaymentState(safeCode, data && data.order_info ? data.order_info : null);
        this.activatePremiumAccess(safeCode, data || {});
    }
    
    // 验证存储的访问码
    async verifyStoredAccessCode(accessCode) {
        this.log(`验证存储的访问码: ${accessCode}`);
        
        const result = await this.verifyAccessCode(accessCode, false);
        
        if (result.success) {
            this.log('存储的访问码验证成功，显示支付成功状态', 'success');
            // 确保DOM元素存在后再显示
            this.waitForElementsAndShowSuccess(accessCode, result.data);
        } else {
            this.log('存储的访问码验证失败，清除状态', 'warning');
            this.resetToFreshUser();
        }
    }
    
    // 等待DOM元素加载完成后显示支付成功状态
    waitForElementsAndShowSuccess(accessCode, data) {
        const checkElements = () => {
            const zpayContainer = document.getElementById('zpay-container');
            const accessContainer = document.getElementById('access-code-container');
            
            if (zpayContainer || accessContainer) {
                this.log('DOM元素已准备完成，显示支付成功状态', 'success');
                this.showPaymentSuccess(accessCode, data);
            } else {
                this.log('DOM元素尚未准备完成，等待中...', 'info');
                setTimeout(checkElements, 200);
            }
        };
        
        checkElements();
    }
    
    // 激活高级访问权限
    activatePremiumAccess(accessCode, data) {
        const accessData = {
            code: accessCode,
            activatedAt: Date.now(),
            deviceId: this.getDeviceId(),
            features: ['sight-reading-tool'],
            version: '3.0-server-verified',
            serverVerified: true,
            productName: data.product_name,
            amount: data.amount,
            orderInfo: data.order_info
        };
        
        try {
            localStorage.setItem(this.storageKeys.premiumAccess, JSON.stringify(accessData));
            this.log('高级访问权限已激活', 'success');
        } catch (e) {
            this.log(`激活权限失败: ${e.message}`, 'error');
        }
    }
    
    // 显示支付成功状态
    showPaymentSuccess(accessCode, data) {
        // 隐藏支付相关UI
        const zpayContainer = document.getElementById('zpay-container');
        const accessContainer = document.getElementById('access-code-container');
        const trialStatus = document.getElementById('trial-status');
        
        if (zpayContainer) zpayContainer.style.display = 'none';
        if (trialStatus) trialStatus.style.display = 'none';
        
        if (accessContainer) {
            accessContainer.innerHTML = `
                <div style="text-align: center; padding: 25px; background: linear-gradient(135deg, #f0fff4 0%, #e8f5e8 100%); border: 2px solid #9ae6b4; border-radius: 12px; margin: 20px 0;">
                    <div style="font-size: 48px; margin-bottom: 15px;">🎉</div>
                    <h3 style="color: #2f855a; margin: 0 0 10px 0; font-size: 20px;">支付成功！</h3>
                    <p style="color: #2f855a; margin: 5px 0; font-size: 14px;">访问码: <strong>${accessCode}</strong></p>
                    <p style="color: #2f855a; margin: 5px 0; font-size: 14px;">高级功能已激活，现在可以无限制使用所有功能</p>
                    <div style="margin-top: 15px;">
                        <button onclick="paymentManager.showAccessCodeDetails()" style="background: #27ae60; color: white; border: none; padding: 8px 16px; border-radius: 6px; margin: 5px; cursor: pointer; font-size: 12px;">查看详情</button>
                        <button onclick="paymentManager.resetToFreshUser()" style="background: #95a5a6; color: white; border: none; padding: 8px 16px; border-radius: 6px; margin: 5px; cursor: pointer; font-size: 12px;">测试重置</button>
                    </div>
                </div>
            `;
        }
        
        // 刷新UI管理器
        if (window.premiumUIManager) {
            setTimeout(() => window.premiumUIManager.refreshUI(), 500);
        }
        
        this.log('支付成功状态已显示', 'success');
    }
    
    // 显示访问码详情
    showAccessCodeDetails() {
        const state = this.getPaymentState();
        if (state) {
            const details = `
访问码: ${state.accessCode}
支付时间: ${new Date(state.paidAt).toLocaleString()}
订单信息: ${state.orderInfo ? JSON.stringify(state.orderInfo, null, 2) : '无'}
            `;
            alert(details);
        }
    }
    
    // 重置到新用户状态（测试用）
    resetToFreshUser() {
        this.log('开始彻底重置到新用户状态', 'warning');
        
        // 1. 清除PaymentStateManager管理的存储
        Object.values(this.storageKeys).forEach(key => {
            this.log(`清除: ${key}`, 'info');
            localStorage.removeItem(key);
        });
        
        // 2. 清除所有IC相关的存储（通过关键词匹配）
        const allKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            allKeys.push(localStorage.key(i));
        }
        
        const icRelatedKeys = allKeys.filter(key => {
            if (!key) return false;
            const lowerKey = key.toLowerCase();
            return lowerKey.includes('ic') || 
                   lowerKey.includes('premium') || 
                   lowerKey.includes('access') ||
                   lowerKey.includes('trial') ||
                   lowerKey.includes('payment') ||
                   lowerKey.includes('zpay');
        });
        
        icRelatedKeys.forEach(key => {
            this.log(`清除IC相关存储: ${key}`, 'info');
            localStorage.removeItem(key);
        });
        
        // 3. 清除已知的遗留存储键
        const legacyKeys = [
            'ic_studio_access_code',
            'ic_studio_premium_activated', 
            'ic_studio_activation_time',
            'server-verified-access',
            'ic-trial-data',
            'icstudio_access_code',
            'icstudio_access_time',
            'ic-device-id',
            'ic-debug-mode',
            'cloudbase-access-token',
            'sight-reading-access'
        ];
        
        legacyKeys.forEach(key => {
            this.log(`清除遗留存储: ${key}`, 'info');
            localStorage.removeItem(key);
        });
        
        // 4. 验证清除结果
        const remainingICKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.toLowerCase().includes('ic')) {
                remainingICKeys.push(key);
            }
        }
        
        if (remainingICKeys.length > 0) {
            this.log(`警告: 仍有${remainingICKeys.length}个IC相关存储未清除: ${remainingICKeys.join(', ')}`, 'warning');
        } else {
            this.log('✅ 所有IC相关存储已清除', 'success');
        }
        
        // 5. 刷新页面前的最后检查
        this.log('状态重置完成，页面将在1秒后刷新', 'success');
        
        // 延迟刷新确保所有清理操作完成
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
    
    // 获取设备ID
    getDeviceId() {
        let deviceId = localStorage.getItem('ic-device-id');
        if (!deviceId) {
            deviceId = 'web-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('ic-device-id', deviceId);
        }
        return deviceId;
    }
    
    // 检查是否已支付
    hasPaidAccess() {
        const state = this.getPaymentState();
        return state && state.hasPaid && state.accessCode;
    }
    
    // 获取当前访问码
    getCurrentAccessCode() {
        const state = this.getPaymentState();
        return state ? state.accessCode : null;
    }
}

// 创建全局实例
window.paymentManager = new PaymentStateManager();

// 暴露重置函数到全局作用域（用于测试和调试）
window.resetToFreshUser = function() {
    if (window.paymentManager) {
        window.paymentManager.resetToFreshUser();
    } else {
        console.error('PaymentStateManager 未初始化');
    }
};

// 终极重置函数 - 如果普通重置不行就用这个
window.nuclearReset = function() {
    console.warn('🚨 执行终极重置 - 将清除所有本地存储');
    
    if (!confirm('警告：这将清除所有本地存储数据，确定继续吗？')) {
        return;
    }
    
    // 记录清除前的所有键
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
        allKeys.push(localStorage.key(i));
    }
    
    console.log('清除前的所有存储键:', allKeys);
    
    // 清除所有本地存储
    localStorage.clear();
    
    // 验证是否清除干净
    if (localStorage.length === 0) {
        console.log('✅ 本地存储已完全清除');
    } else {
        console.warn('⚠️ 仍有未清除的存储项');
    }
    
    // 刷新页面
    alert('终极重置完成，页面即将刷新');
    setTimeout(() => {
        window.location.reload();
    }, 1000);
};

// 改进的验证函数（替换原有的verifyAccessCodeWithServer）
window.verifyAccessCodeWithServer = async function() {
    const input = document.getElementById('access-code-input');
    const resultDiv = document.getElementById('verify-result');
    const button = document.getElementById('verify-btn');
    
    if (!input || !resultDiv) return;
    
    const code = input.value.trim().toUpperCase();
    
    // 显示验证中状态
    resultDiv.innerHTML = '<span style="color: #3498db;">🔄 正在验证访问码...<br><small>使用改进的验证系统，请稍候</small></span>';
    button.disabled = true;
    button.style.opacity = '0.5';
    
    try {
        const result = await window.paymentManager.verifyAccessCode(code, true);
        
        if (result.success) {
            resultDiv.innerHTML = '<span style="color: #27ae60;">✅ 验证成功！正在激活功能...</span>';
            
            // 清空输入框
            input.value = '';
            
            // 显示支付成功状态
            setTimeout(() => {
                window.paymentManager.showPaymentSuccess(code, result.data);
            }, 1500);
            
        } else {
            resultDiv.innerHTML = `<span style="color: #e74c3c;">❌ ${result.error}</span>`;
            
            // 3秒后清除错误消息
            setTimeout(() => {
                resultDiv.innerHTML = '';
            }, 3000);
        }
        
    } catch (error) {
        console.error('验证访问码失败:', error);
        resultDiv.innerHTML = '<span style="color: #e74c3c;">❌ 系统错误，请稍后重试</span>';
    }
    
    // 恢复按钮状态
    setTimeout(() => {
        if (typeof updateVerifyButton === 'function') {
            updateVerifyButton();
        } else {
            button.disabled = false;
            button.style.opacity = '1';
        }
    }, 500);
};

// 调试模式切换
window.toggleDebugMode = function() {
    const currentMode = localStorage.getItem('ic-debug-mode') === 'true';
    localStorage.setItem('ic-debug-mode', (!currentMode).toString());
    console.log('调试模式', !currentMode ? '已开启' : '已关闭');
    window.location.reload();
};

// 添加调试辅助函数
window.testPaymentPersistence = function(accessCode = 'TEST12345678') {
    console.log('🧪 开始测试支付状态持久化...');
    
    if (window.paymentManager) {
        // 模拟支付成功
        const mockData = {
            product_name: '测试产品授权',
            amount: '1.00',
            order_info: {
                out_trade_no: 'TEST_' + Date.now(),
                status: 'paid',
                paid_at: new Date().toISOString()
            }
        };
        
        window.paymentManager.savePaymentState(accessCode, mockData.order_info);
        window.paymentManager.activatePremiumAccess(accessCode, mockData);
        
        console.log('✅ 模拟支付状态已保存');
        console.log('🔄 请刷新页面测试状态持久化');
        console.log('🔧 使用 resetToFreshUser() 可以清除测试数据');
    } else {
        console.error('❌ PaymentStateManager 未加载');
    }
};

// 显示当前状态的调试函数
window.showPaymentState = function() {
    if (window.paymentManager) {
        const state = window.paymentManager.getPaymentState();
        const accessCode = window.paymentManager.getCurrentAccessCode();
        const hasPaid = window.paymentManager.hasPaidAccess();
        
        console.group('💳 支付状态详情');
        console.log('已支付:', hasPaid ? '✅ 是' : '❌ 否');
        console.log('当前访问码:', accessCode || '无');
        console.log('完整状态:', state);
        console.groupEnd();
        
        return {hasPaid, accessCode, state};
    } else {
        console.error('❌ PaymentStateManager 未加载');
        return null;
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否有已支付状态，如果有则显示
    if (window.paymentManager.hasPaidAccess()) {
        console.log('🎉 检测到已支付状态，将显示支付成功界面');
        console.log('💡 使用 showPaymentState() 查看详情');
    } else {
        console.log('ℹ️ 未检测到支付状态');
        console.log('💡 使用 testPaymentPersistence() 测试状态持久化');
    }
    
    console.log('🔧 可用调试命令:');
    console.log('  - showPaymentState() : 显示当前支付状态');
    console.log('  - testPaymentPersistence() : 测试状态持久化');
    console.log('  - resetToFreshUser() : 重置到新用户状态');
    console.log('  - toggleDebugMode() : 切换调试模式');
});

console.log('✅ PaymentStateManager 已加载，调试功能已启用');
