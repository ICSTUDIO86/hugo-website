/**
 * IC Studio - 访问码找回功能
 * 通过设备指纹和支付信息找回访问码
 */

(function() {
    'use strict';
    
    console.log('🔍 访问码找回功能已加载');
    
    // 生成设备指纹（与支付成功页面一致）
    function generateDeviceFingerprint() {
        const features = {
            userAgent: navigator.userAgent,
            screen: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled,
            colorDepth: screen.colorDepth,
            pixelRatio: window.devicePixelRatio || 1
        };
        
        const fingerprint = btoa(JSON.stringify(features)).substring(0, 16);
        console.log('🔐 设备指纹已生成:', fingerprint);
        return fingerprint;
    }
    
    // 通过设备指纹和支付信息找回访问码
    window.findAccessCodeByDevice = async function(paymentAmount, paymentDate) {
        try {
            console.log('🔍 开始通过设备指纹找回访问码...');
            
            const deviceFingerprint = generateDeviceFingerprint();
            const searchData = {
                device_fingerprint: deviceFingerprint,
                search_type: 'device_payment'
            };
            
            // 如果提供了支付信息，添加到搜索条件
            if (paymentAmount) {
                searchData.payment_amount = paymentAmount;
                searchData.search_type = 'time_amount';
            }
            
            if (paymentDate) {
                const date = new Date(paymentDate);
                searchData.payment_date_start = new Date(date.getTime() - 24 * 60 * 60 * 1000).toISOString(); // 前一天
                searchData.payment_date_end = new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 后一天
            }
            
            const response = await fetch('https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/findAccessCodeByDevice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Request-Source': 'IC-Studio-Recovery'
                },
                body: JSON.stringify(searchData)
            });
            
            const result = await response.json();
            console.log('🔍 找回结果:', result);
            
            return result;
            
        } catch (error) {
            console.error('❌ 访问码找回失败:', error);
            return {
                success: false,
                error: '查找失败，请稍后重试'
            };
        }
    };
    
    // 通过时间和金额找回访问码（不依赖设备指纹）
    window.findAccessCodeByTimeAmount = async function(paymentAmount, paymentDateStart, paymentDateEnd) {
        try {
            console.log('🕐 开始通过时间+金额找回访问码...');
            
            const searchData = {
                search_type: 'time_amount',
                payment_amount: paymentAmount,
                payment_date_start: paymentDateStart,
                payment_date_end: paymentDateEnd || new Date().toISOString()
            };
            
            const response = await fetch('https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/findAccessCodeByDevice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Request-Source': 'IC-Studio-Recovery'
                },
                body: JSON.stringify(searchData)
            });
            
            const result = await response.json();
            console.log('🕐 时间+金额找回结果:', result);
            
            return result;
            
        } catch (error) {
            console.error('❌ 访问码找回失败:', error);
            return {
                success: false,
                error: '查找失败，请稍后重试'
            };
        }
    };
    
    // 显示找回结果
    window.showRecoveryResults = function(results) {
        if (!results.success) {
            alert('找回失败：' + (results.error || '未知错误'));
            return;
        }
        
        if (results.results.length === 0) {
            alert('没有找到匹配的访问码，请检查输入的信息是否正确');
            return;
        }
        
        let message = `找到 ${results.total_found} 个匹配的访问码：\n\n`;
        
        results.results.forEach((item, index) => {
            message += `${index + 1}. 访问码：${item.access_code}\n`;
            message += `   购买时间：${new Date(item.created_at).toLocaleString()}\n`;
            message += `   产品：${item.product_name}\n`;
            message += `   匹配度：${item.match_confidence}%\n\n`;
        });
        
        alert(message);
        
        // 自动填充第一个找到的访问码
        if (results.results.length > 0) {
            const firstCode = results.results[0].access_code;
            const codeInput = document.getElementById('access-code-input') || 
                            document.querySelector('input[placeholder*="访问码"]') ||
                            document.querySelector('input[type="text"]');
            
            if (codeInput) {
                codeInput.value = firstCode;
                codeInput.focus();
                console.log('✅ 已自动填充访问码:', firstCode);
            }
        }
    };
    
    console.log('✅ 访问码找回功能已就绪');
    console.log('💡 可用函数: findAccessCodeByDevice(), findAccessCodeByTimeAmount(), showRecoveryResults()');
    
})();