/**
 * 测试支付注入器
 * 在 /sight-reading-tool/ 页面允许测试支付
 */

(function() {
    'use strict';
    
    console.log('💉 测试支付注入器已加载');
    
    // 测试支付函数
    window.triggerTestPayment = async function() {
        console.log('🧪 触发测试支付...');
        
        const orderId = 'TEST-' + Date.now();
        const deviceId = 'test-device-' + Math.random().toString(36).substr(2, 9);
        
        try {
            // 显示加载提示
            const loadingDiv = document.createElement('div');
            loadingDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                z-index: 99999;
                text-align: center;
            `;
            loadingDiv.innerHTML = `
                <h3>🧪 测试模式</h3>
                <p>正在生成测试访问码...</p>
                <div style="margin-top: 10px;">
                    <div style="border: 3px solid #f3f3f3; border-top: 3px solid #667eea; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            document.body.appendChild(loadingDiv);
            
            // 调用CloudBase API生成访问码
            const response = await fetch('https://cloud1-4g1r5ho01a0cfd85.service.tcloudbase.com/generate-access-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Request-Source': 'IC-Studio-Test',
                    'X-Test-Mode': 'true'
                },
                body: JSON.stringify({
                    orderId: orderId,
                    deviceId: deviceId,
                    paymentMethod: 'test',
                    amount: 0,
                    timestamp: Date.now(),
                    testMode: true
                })
            });
            
            const result = await response.json();
            
            // 移除加载提示
            loadingDiv.remove();
            
            if (result.success) {
                console.log('✅ 测试访问码生成成功:', result.accessCode);
                
                // 保存到localStorage
                const accessData = {
                    code: result.accessCode,
                    activatedAt: Date.now(),
                    deviceId: deviceId,
                    expiresAt: null,
                    version: 'test-mode',
                    source: 'test',
                    autoFill: true
                };
                localStorage.setItem('ic-premium-access', JSON.stringify(accessData));
                
                // 如果有统一支付成功处理函数，调用它
                if (window.showUnifiedPaymentSuccess) {
                    window.showUnifiedPaymentSuccess(result.accessCode, 'test-mode');
                } else {
                    // 简单的成功提示
                    alert(`✅ 测试成功！\n\n访问码: ${result.accessCode}\n\n已保存到本地，可以开始使用了！`);
                    // 刷新页面以应用访问码
                    window.location.reload();
                }
                
                return result.accessCode;
            } else {
                console.error('❌ 生成访问码失败:', result.message);
                alert('测试失败: ' + result.message);
                return null;
            }
        } catch (error) {
            console.error('❌ 测试支付出错:', error);
            alert('测试支付失败: ' + error.message);
            return null;
        }
    };
    
    // 监听支付按钮点击
    document.addEventListener('click', function(e) {
        const target = e.target;
        
        // 检查是否点击了支付按钮
        if (target.matches('.purchase-btn, .buy-btn, [data-payment], button[onclick*="pay"], button[onclick*="Pay"]')) {
            // 检查是否按住了Shift键或Alt键
            if (e.shiftKey || e.altKey) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🧪 检测到测试模式触发 (Shift/Alt + Click)');
                window.triggerTestPayment();
                return false;
            }
        }
    }, true); // 使用捕获阶段
    
    // 添加全局快捷键
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Shift + T 触发测试支付
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
            e.preventDefault();
            console.log('🧪 快捷键触发测试支付');
            window.triggerTestPayment();
        }
    });
    
    // 在控制台显示提示
    console.log('%c🧪 测试模式已启用', 'color: #667eea; font-size: 16px; font-weight: bold;');
    console.log('%c使用以下方式触发测试支付:', 'color: #666; font-size: 14px;');
    console.log('%c1. Shift + 点击支付按钮', 'color: #666; font-size: 12px;');
    console.log('%c2. Alt + 点击支付按钮', 'color: #666; font-size: 12px;');
    console.log('%c3. Ctrl/Cmd + Shift + T', 'color: #666; font-size: 12px;');
    console.log('%c4. 控制台执行: triggerTestPayment()', 'color: #666; font-size: 12px;');
    
})();