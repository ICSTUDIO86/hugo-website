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
        <div id="alipay-modal-overlay">
            <div id="alipay-modal-scroll-container">
                <div id="alipay-lookup-modal">
                    <div id="alipay-lookup-header">
                        <h1 id="alipay-lookup-title">
                            <span class="alipay-lookup-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="11" cy="11" r="7"></circle>
                                    <path d="m20 20-3.5-3.5"></path>
                                </svg>
                            </span>
                            <span>通过订单号找回访问码</span>
                        </h1>
                    </div>

                    <div id="alipay-lookup-body">
                        <div class="alipay-field">
                            <input type="text" id="alipay-account-input" placeholder="请输入订单号或商家订单号" />
                        </div>

                        <div id="alipay-lookup-result"></div>

                        <div class="alipay-actions">
                            <button id="alipay-lookup-cancel-btn" type="button" onclick="closeAlipayLookupDialog()">
                                取消
                            </button>
                            <button id="alipay-lookup-submit-btn" type="button" onclick="performAlipayLookup()">
                                <span class="alipay-lookup-icon" aria-hidden="true">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="11" cy="11" r="7"></circle>
                                        <path d="m20 20-3.5-3.5"></path>
                                    </svg>
                                </span>
                                <span>查找访问码</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    const style = document.createElement('style');
    style.id = 'alipay-lookup-dialog-style';
    style.textContent = `
        #alipay-modal-overlay {
            position: fixed;
            inset: 0;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            box-sizing: border-box;
            background: rgba(15, 23, 42, 0.52);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
        }

        #alipay-modal-scroll-container {
            width: min(100%, 520px);
            max-height: calc(100vh - 48px);
            overflow-y: auto;
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior: contain;
            touch-action: pan-y;
            box-sizing: border-box;
        }

        #alipay-lookup-modal {
            background: #ffffff;
            border: 1px solid rgba(64, 137, 227, 0.16);
            border-radius: 28px;
            overflow: hidden;
            box-shadow: 0 30px 80px rgba(15, 23, 42, 0.22);
            animation: alipayLookupAppear 0.3s ease-out;
        }

        #alipay-lookup-header {
            padding: 28px 30px 22px;
            background: #f8fbff;
            border-bottom: 1px solid rgba(64, 137, 227, 0.12);
        }

        #alipay-lookup-title {
            margin: 0;
            color: #0f172a;
            font-size: 28px;
            line-height: 1.15;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .alipay-lookup-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 1.15em;
            height: 1.15em;
            color: currentColor;
            flex: 0 0 auto;
        }

        .alipay-lookup-icon svg {
            width: 100%;
            height: 100%;
        }

        #alipay-lookup-body {
            padding: 24px 30px 30px;
        }

        .alipay-field {
            margin-bottom: 22px;
        }

        #alipay-account-input {
            width: 100%;
            min-height: 52px;
            padding: 0 16px;
            border: 1.5px solid rgba(64, 137, 227, 0.2);
            background: #ffffff;
            border-radius: 16px;
            font-size: 16px;
            box-sizing: border-box;
            color: #0f172a;
            transition: all 0.2s ease;
        }

        #alipay-account-input:focus {
            border-color: #4089e3;
            box-shadow: 0 0 0 4px rgba(64, 137, 227, 0.12);
            outline: none;
        }

        #alipay-lookup-result:empty {
            display: none;
        }

        #alipay-lookup-result:not(:empty) {
            margin-bottom: 20px;
        }

        .alipay-actions {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        #alipay-lookup-cancel-btn,
        #alipay-lookup-submit-btn {
            border-radius: 999px;
            min-height: 48px;
            padding: 0 22px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        #alipay-lookup-cancel-btn {
            flex: 1;
            border: 1px solid rgba(64, 137, 227, 0.16);
            background: #ffffff;
            color: #1457a5;
            box-shadow: 0 14px 30px rgba(64, 137, 227, 0.08);
        }

        #alipay-lookup-cancel-btn:hover {
            border-color: rgba(64, 137, 227, 0.24);
            background: #f8fbff;
            transform: translateY(-1px);
            box-shadow: 0 18px 36px rgba(64, 137, 227, 0.12);
        }

        #alipay-lookup-submit-btn {
            flex: 2;
            border: none;
            background: #1a7be8;
            color: #ffffff;
            box-shadow: 0 18px 36px rgba(26, 123, 232, 0.24);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        #alipay-lookup-submit-btn:hover {
            transform: translateY(-2px);
            background: #1457a5;
            box-shadow: 0 24px 42px rgba(20, 87, 165, 0.28);
        }

        @keyframes alipayLookupAppear {
            from {
                opacity: 0;
                transform: scale(0.96) translateY(14px);
            }
            to {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }

        @media (max-width: 640px) {
            #alipay-modal-overlay {
                padding: 16px;
            }

            #alipay-lookup-modal {
                border-radius: 24px;
            }

            #alipay-lookup-header {
                padding: 24px 22px 18px;
            }

            #alipay-lookup-body {
                padding: 20px 22px 24px;
            }

            #alipay-lookup-title {
                font-size: 24px;
            }
        }
    `;
    document.head.appendChild(style);

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
    const style = document.getElementById('alipay-lookup-dialog-style');
    if (dialog) {
        dialog.remove();
    }
    if (style) {
        style.remove();
    }
}

function isBundleMerchantOrder(orderNumber) {
    return /^IBD\d{10,24}$/i.test(String(orderNumber || '').trim());
}

function getLookupTradeNo(orderInfo) {
    if (!orderInfo) return '';
    return String(
        orderInfo.alipay_trade_no ||
        orderInfo.payment_trade_no ||
        orderInfo.trade_no ||
        ''
    ).trim();
}

function isLookupNotFound(result) {
    if (!result) return true;
    if (result.success) return false;
    return result.code === 'ORDER_NOT_FOUND' || /未找到/.test(result.error || '');
}

// 执行订单号查找
function escapeLookupHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatLookupDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

function formatLookupDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

async function performAlipayLookup() {
    const input = document.getElementById('alipay-account-input');
    const resultDiv = document.getElementById('alipay-lookup-result');
    
    if (!input || !resultDiv) {
        console.error('❌ 找不到必要的页面元素');
        return;
    }
    
    const orderNumber = input.value.trim();
    
    if (!orderNumber) {
        resultDiv.innerHTML = '<div style="color: #9a3412; padding: 12px 14px; background: #fff7ed; border: 1px solid rgba(249, 115, 22, 0.24); border-radius: 16px; font-size: 14px; line-height: 1.6;">请输入订单号</div>';
        return;
    }
    
    // 验证格式：商家订单号或支付宝交易号
    const isMerchantOrder = /^IC\d{17}$/.test(orderNumber) || isBundleMerchantOrder(orderNumber);  // 商家订单号格式
    const isAlipayTrade = /^\d{28}$/.test(orderNumber);     // 支付宝交易号格式
    
    if (!isMerchantOrder && !isAlipayTrade) {
        resultDiv.innerHTML = '<div style="color: #9a3412; padding: 12px 14px; background: #fff7ed; border: 1px solid rgba(249, 115, 22, 0.24); border-radius: 16px; font-size: 14px; line-height: 1.6;">请输入有效的订单号格式<br><small>商家订单号：IC/ICS/IBD开头的号码；支付宝交易号：28位数字</small></div>';
        return;
    }
    
    // 显示加载状态
    resultDiv.innerHTML = '<div style="color: #1457a5; padding: 14px 16px; background: #f8fbff; border: 1px solid rgba(64, 137, 227, 0.16); border-radius: 16px; text-align: center; font-size: 14px; font-weight: 600;">正在查找相关记录...</div>';
    
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
        const BUNDLE_LOOKUP_ENDPOINT = 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/findBundleAccessCodeByOrderNo';

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

        const lookupChain = isBundleMerchantOrder(orderNumber)
            ? [BUNDLE_LOOKUP_ENDPOINT]
            : [SINGLE_LOOKUP_ENDPOINT, FULL_LOOKUP_ENDPOINT, BUNDLE_LOOKUP_ENDPOINT];

        let actualResult = null;

        for (const endpoint of lookupChain) {
            try {
                actualResult = await fetchLookup(endpoint);
                console.log('🔍 查找结果:', endpoint, actualResult);
            } catch (lookupError) {
                console.warn('⚠️ 查找失败，尝试下一个接口:', endpoint, lookupError);
                actualResult = null;
            }

            if (actualResult && (actualResult.success || !isLookupNotFound(actualResult))) {
                break;
            }
        }
        
        if (actualResult && actualResult.success && actualResult.result) {
            // 显示找到的访问码
            const orderInfo = actualResult.result.order_info;
            const accessCode = String(actualResult.result.access_code || '');
            const tradeNo = getLookupTradeNo(orderInfo);
            const createdDate = formatLookupDate(orderInfo.created_time);
            const paymentTime = formatLookupDateTime(orderInfo.payment_time);
            const safeProductName = escapeLookupHtml(orderInfo.product_name);
            const safeAmount = escapeLookupHtml(orderInfo.amount);
            const safeAccessCode = escapeLookupHtml(accessCode);
            const safeMerchantOrderNo = escapeLookupHtml(orderInfo.merchant_order_no);
            const safeTradeNo = escapeLookupHtml(tradeNo);
            const safeUsageTip = escapeLookupHtml(actualResult.result.usage_tip);
            const copyPayload = JSON.stringify(accessCode);
            
            const resultHtml = `
                <div style="background: #f8fbff; border: 1px solid rgba(64, 137, 227, 0.16); padding: 18px; border-radius: 18px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-weight: 700; color: #1457a5;">访问码信息</span>
                        <span style="font-size: 12px; color: #6b7a90;">${createdDate}</span>
                    </div>
                    <div style="margin-bottom: 8px;">
                        <strong style="color: #0f172a;">访问码：</strong>
                        <span style="font-family: monospace; background: #ffffff; padding: 6px 10px; border-radius: 10px; border: 1px solid rgba(64, 137, 227, 0.16); color: #1457a5;">${safeAccessCode}</span>
                        <button onclick='copyToClipboard(${copyPayload})' style="margin-left: 8px; background: #1a7be8; color: white; border: none; padding: 7px 10px; border-radius: 999px; cursor: pointer; font-size: 12px; font-weight: 700; box-shadow: 0 10px 22px rgba(26, 123, 232, 0.2);">复制</button>
                    </div>
                    <div style="margin-bottom: 5px; color: #334155;">
                        <strong>产品：</strong>${safeProductName}
                    </div>
                    <div style="margin-bottom: 5px; color: #334155;">
                        <strong>金额：</strong>¥${safeAmount}
                    </div>
                    <div style="margin-bottom: 5px; color: #334155;">
                        <strong>支付时间：</strong>${paymentTime}
                    </div>
                    <div style="margin-bottom: 5px; color: #334155;">
                        <strong>商家订单号：</strong><span style="font-family: monospace; font-size: 12px;">${safeMerchantOrderNo}</span>
                    </div>
                    ${tradeNo ? `<div style="margin-bottom: 5px; color: #334155;"><strong>订单号：</strong><span style="font-family: monospace; font-size: 12px;">${safeTradeNo}</span></div>` : ''}
                </div>
            `;
            
            resultDiv.innerHTML = `
                <div style="color: #1457a5; padding: 15px; background: #f8fbff; border: 1px solid rgba(64, 137, 227, 0.16); border-radius: 16px; margin-bottom: 15px; text-align: center; font-weight: 700;">
                    访问码找回成功
                </div>
                ${resultHtml}
                <div style="margin-top: 15px; padding: 15px; background: #eef5fc; border-radius: 16px; border: 1px solid rgba(64, 137, 227, 0.14); text-align: center;">
                    <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.6;">${safeUsageTip}</p>
                </div>
            `;
            
        } else {
            // 未找到记录
            const errorMessage = escapeLookupHtml(actualResult?.error || '未找到相关记录');
            resultDiv.innerHTML = `
                <div style="color: #9a3412; padding: 18px; background: #fff7ed; border: 1px solid rgba(249, 115, 22, 0.24); border-radius: 18px; text-align: center;">
                    <div style="font-weight: 700; margin-bottom: 10px;">${errorMessage}</div>
                    <div style="font-size: 14px; color: #9a3412; line-height: 1.6;">
                        可能的原因：<br/>
                        • 订单号输入有误<br/>
                        • 订单不存在或已退款<br/>
                        • 订单状态异常
                    </div>
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(249, 115, 22, 0.2); color: #7c2d12;">
                        <strong>联系客服：</strong><br/>
                        service@icstudio.club
                    </div>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('查找失败:', error);
        const safeErrorMessage = escapeLookupHtml(error?.message || '未知错误');
        resultDiv.innerHTML = `
            <div style="color: #9a3412; padding: 15px; background: #fff7ed; border: 1px solid rgba(249, 115, 22, 0.24); border-radius: 16px; text-align: center; line-height: 1.6;">
                查找失败，请稍后重试<br/>
                <small style="color: #7c2d12;">错误信息：${safeErrorMessage}</small>
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
            background: #1a7be8;
            color: white;
            padding: 15px 20px;
            border-radius: 16px;
            box-shadow: 0 18px 36px rgba(26, 123, 232, 0.24);
            z-index: 10001;
            font-size: 14px;
            font-weight: 700;
        `;
        notification.textContent = '访问码已复制';
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
