/**
 * IC Studio - 订单号查找访问码功能
 * 完全不影响退款系统
 */

// 订单号查找功能
function showAlipayLookupDialog() {
    console.log('🔍 显示订单号查找对话框');
    
    // 创建弹窗HTML
    const dialog = document.createElement('div');
    dialog.id = 'alipay-lookup-dialog';
    dialog.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 0; margin: 0; box-sizing: border-box;" id="alipay-modal-overlay">
            <div style="width: 100%; max-width: 500px; max-height: 100vh; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; touch-action: pan-y; padding: 20px; box-sizing: border-box; margin: 20px;" id="alipay-modal-scroll-container">
                <div style="background: white; padding: 40px; border-radius: 16px; width: 100%; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3); box-sizing: border-box; min-height: min-content;">
                <div style="margin-bottom: 30px; text-align: center;">
                    <h1 style="color: #333; margin-bottom: 10px;">🔍 通过订单号找回访问码</h1>
                </div>
                
                <div style="margin-bottom: 30px;">
                    <label style="display: block; margin-bottom: 8px; color: #333; font-weight: 600;">订单号</label>
                    <input type="text" id="alipay-account-input" placeholder="请输入订单号或商家订单号" 
                           style="width: 100%; padding: 15px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; box-sizing: border-box; transition: border-color 0.3s ease;"
                </div>
                
                <div id="alipay-lookup-result" style="margin-bottom: 20px; min-height: 20px;"></div>
                
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button onclick="closeAlipayLookupDialog()" 
                            style="padding: 15px 30px; background: #f8f9fa; color: #333; border: 2px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s ease;"
                            onmouseover="this.style.background='#e2e8f0'" 
                            onmouseout="this.style.background='#f8f9fa'">
                        取消
                    </button>
                    <button onclick="performAlipayLookup()" 
                            style="padding: 15px 30px; background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3); transition: all 0.3s ease;"
                            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(33, 150, 243, 0.4)'" 
                            onmouseout="this.style.transform='translateY(0px)'; this.style.boxShadow='0 4px 15px rgba(33, 150, 243, 0.3)'">
                        🔍 查找访问码
                    </button>
                </div>
                
                <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee; background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px -10px 0;">
                    <p style="color: #666; font-size: 13px; margin: 0; line-height: 1.5;">
                        <strong>📋 使用说明：</strong><br/>
                        • <strong>商家订单号</strong>：在支付宝账单中的条维码下方，如 IC17575395673115298<br/>
                        • <strong>订单号</strong>：在支付宝账单中，如 2025091122001480241441480505<br/>
                        • 任意一种订单号都可以找回对应的访问码
                    </p>
                </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    // 专用移动端滚动事件处理 - 适用于所有移动浏览器
    const modalOverlay = dialog.querySelector('#alipay-modal-overlay');
    const modalScrollContainer = dialog.querySelector('#alipay-modal-scroll-container');

    if (modalOverlay && modalScrollContainer) {
        // 点击背景关闭弹窗
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) {
                closeAlipayLookupDialog();
            }
        });

        // 防止滚动事件传播到背景 - 适用于所有移动浏览器
        modalScrollContainer.addEventListener('touchstart', function(e) {
            e.stopPropagation();
        }, { passive: true });

        modalScrollContainer.addEventListener('touchmove', function(e) {
            e.stopPropagation();
        }, { passive: true });

        modalScrollContainer.addEventListener('wheel', function(e) {
            e.stopPropagation();
        }, { passive: false });

        modalScrollContainer.addEventListener('scroll', function(e) {
            e.stopPropagation();
        }, { passive: true });

        modalScrollContainer.addEventListener('touchend', function(e) {
            e.stopPropagation();
        }, { passive: true });
    }
    
    // 聚焦到输入框
    setTimeout(() => {
        const input = document.getElementById('alipay-account-input');
        if (input) input.focus();
    }, 100);
}

// 关闭查找对话框
function closeAlipayLookupDialog() {
    const dialog = document.getElementById('alipay-lookup-dialog');
    if (dialog) {
        dialog.remove();
    }
}

// 执行订单号查找
async function performAlipayLookup() {
    const input = document.getElementById('alipay-account-input');
    const resultDiv = document.getElementById('alipay-lookup-result');
    
    if (!input || !resultDiv) {
        console.error('❌ 找不到必要的页面元素');
        return;
    }
    
    const orderNumber = input.value.trim();
    
    if (!orderNumber) {
        resultDiv.innerHTML = '<div style="color: #e74c3c; padding: 10px; background: #ffeaa7; border-radius: 8px; font-size: 14px;">❌ 请输入订单号</div>';
        return;
    }
    
    // 验证格式：商家订单号或支付宝交易号
    const isMerchantOrder = /^IC\d{17}$/.test(orderNumber);  // 商家订单号格式
    const isAlipayTrade = /^\d{28}$/.test(orderNumber);     // 支付宝交易号格式
    
    if (!isMerchantOrder && !isAlipayTrade) {
        resultDiv.innerHTML = '<div style="color: #e74c3c; padding: 10px; background: #ffeaa7; border-radius: 8px; font-size: 14px;">❌ 请输入有效的订单号格式<br><small>商家订单号：IC开头的号码；支付宝交易号：28位数字</small></div>';
        return;
    }
    
    // 显示加载状态
    resultDiv.innerHTML = '<div style="color: #3498db; padding: 15px; background: #f0f9ff; border-radius: 8px; text-align: center; font-size: 14px;">🔄 正在查找相关记录...</div>';
    
    try {
        // 调用CloudBase函数
        const requestBody = {};
        if (isMerchantOrder) {
            requestBody.order_no = orderNumber;
        } else {
            requestBody.zpay_trade_no = orderNumber;
        }
        
        const SINGLE_LOOKUP_ENDPOINT = 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/findSingleAccessCodeByOrderNo';
        const FULL_LOOKUP_ENDPOINT = 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/findAccessCodeProxy';

        async function fetchLookup(endpoint) {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            return await response.json();
        }

        let actualResult;

        try {
            actualResult = await fetchLookup(SINGLE_LOOKUP_ENDPOINT);
            console.log('🔍 单件查找结果:', actualResult);
        } catch (singleError) {
            console.warn('⚠️ 单件查找失败，尝试完整版:', singleError);
            actualResult = null;
        }

        const shouldFallback = !actualResult || (actualResult && actualResult.success === false && (
            actualResult.code === 'ORDER_NOT_FOUND' ||
            /未找到/.test(actualResult.error || '')
        ));

        if (shouldFallback) {
            actualResult = await fetchLookup(FULL_LOOKUP_ENDPOINT);
            console.log('🔍 完整版查找结果:', actualResult);
        }
        
        if (actualResult && actualResult.success && actualResult.result) {
            // 显示找到的访问码
            const orderInfo = actualResult.result.order_info;
            const accessCode = actualResult.result.access_code;
            
            const resultHtml = `
                <div style="background: #f0fff4; border: 1px solid #9ae6b4; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-weight: 600; color: #2f855a;">访问码信息</span>
                        <span style="font-size: 12px; color: #666;">${new Date(orderInfo.created_time).toLocaleDateString()}</span>
                    </div>
                    <div style="margin-bottom: 8px;">
                        <strong style="color: #333;">访问码：</strong>
                        <span style="font-family: monospace; background: #e6fffa; padding: 4px 8px; border-radius: 4px; border: 1px solid #81e6d9;">${accessCode}</span>
                        <button onclick="copyToClipboard('${accessCode}')" style="margin-left: 8px; background: #38a169; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">复制</button>
                    </div>
                    <div style="margin-bottom: 5px;">
                        <strong>产品：</strong>${orderInfo.product_name}
                    </div>
                    <div style="margin-bottom: 5px;">
                        <strong>金额：</strong>¥${orderInfo.amount}
                    </div>
                    <div style="margin-bottom: 5px;">
                        <strong>支付时间：</strong>${new Date(orderInfo.payment_time).toLocaleString()}
                    </div>
                    <div style="margin-bottom: 5px;">
                        <strong>商家订单号：</strong><span style="font-family: monospace; font-size: 12px;">${orderInfo.merchant_order_no}</span>
                    </div>
                    ${orderInfo.alipay_trade_no ? `<div style="margin-bottom: 5px;"><strong>订单号：</strong><span style="font-family: monospace; font-size: 12px;">${orderInfo.alipay_trade_no}</span></div>` : ''}
                </div>
            `;
            
            resultDiv.innerHTML = `
                <div style="color: #22c55e; padding: 15px; background: #f0fff4; border-radius: 8px; margin-bottom: 15px; text-align: center; font-weight: 600;">
                    🎉 访问码找回成功
                </div>
                ${resultHtml}
                <div style="margin-top: 15px; padding: 15px; background: #e6fffa; border-radius: 8px; border: 1px solid #81e6d9; text-align: center;">
                    <p style="margin: 0; color: #2d3748; font-size: 14px;">${actualResult.result.usage_tip}</p>
                </div>
            `;
            
        } else {
            // 未找到记录
            const errorMessage = actualResult.error || '未找到相关记录';
            resultDiv.innerHTML = `
                <div style="color: #f59e0b; padding: 20px; background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; text-align: center;">
                    <div style="margin-bottom: 15px; font-size: 48px;">😔</div>
                    <div style="font-weight: 600; margin-bottom: 10px;">${errorMessage}</div>
                    <div style="font-size: 14px; color: #92400e; line-height: 1.5;">
                        可能的原因：<br/>
                        • 订单号输入有误<br/>
                        • 订单不存在或已退款<br/>
                        • 订单状态异常
                    </div>
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #fbbf24;">
                        <strong>联系客服：</strong><br/>
                        📧 service@icstudio.club
                    </div>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('查找失败:', error);
        resultDiv.innerHTML = `
            <div style="color: #e74c3c; padding: 15px; background: #fee; border: 1px solid #fecaca; border-radius: 8px; text-align: center;">
                ❌ 查找失败，请稍后重试<br/>
                <small style="color: #666;">错误信息：${error.message}</small>
            </div>
        `;
    }
}

// 复制到剪贴板
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // 显示复制成功提示
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #22c55e;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 10001;
            font-size: 14px;
            font-weight: 600;
        `;
        notification.innerHTML = `📋 访问码已复制`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 2000);
    }).catch(err => {
        console.error('复制失败:', err);
    });
}

// 绑定按钮事件 - 更健壮的绑定方式
function bindRecoverButton() {
    const recoverButton = document.getElementById('recover-access-code-btn');
    if (recoverButton && !recoverButton.onclick) {
        recoverButton.onclick = showAlipayLookupDialog;
        console.log('✅ 订单号查找功能已绑定');
        return true;
    }
    return false;
}

// DOM加载完成后绑定
document.addEventListener('DOMContentLoaded', function() {
    if (!bindRecoverButton()) {
        console.warn('⚠️ 未找到 recover-access-code-btn 按钮，将延迟绑定');
        // 延迟绑定，处理动态加载的按钮
        setTimeout(() => {
            if (!bindRecoverButton()) {
                console.warn('⚠️ 延迟绑定仍未找到按钮');
            }
        }, 1000);
    }
});

// 暴露到全局，便于手动调用
window.showOrderLookupDialog = showAlipayLookupDialog;
