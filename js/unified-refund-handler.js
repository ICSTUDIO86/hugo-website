/**
 * IC Studio - 统一退款处理器（支持完整版 + 单件）
 * 规则：先尝试单件退款，不是单件访问码则回退到完整版退款
 */

(function() {
    'use strict';

    console.log('🔄 统一退款处理器初始化...');

    const SINGLE_REFUND_API_ENDPOINT = 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/refundSingleByAccessCode';
    const FULL_REFUND_API_ENDPOINT = 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/refundByAccessCode';
    const BUNDLE_REFUND_API_ENDPOINT = 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/refundBundleByAccessCode';
    const REFUND_RESET_KEY = 'ic-refund-reset';
    const REFUND_RESET_HANDLED_KEY = 'ic-refund-reset-handled';
    const ACCESS_RESET_KEYS = [
        'ic-single-product-access',
        'ic_single_product_access',
        'ic_full_version',
        'ic_verified_from_access_page',
        'ic_verified_timestamp',
        'ic-premium-access',
        'ic-studio-payment-state',
        'ic-studio-access-codes',
        'ic-premium-access',
        'ic_studio_access_code',
        'ic_studio_premium_activated',
        'ic_studio_activation_time',
        'ic-full-access',
        'ic-verified-user',
        'ic-access-timestamp',
        'icstudio_access_code',
        'icstudio_access_time'
    ];

    function clearLocalAccessState() {
        try {
            ACCESS_RESET_KEYS.forEach((key) => {
                localStorage.removeItem(key);
            });
        } catch (e) {
            console.warn('⚠️ 清理本地访问状态失败:', e.message);
        }
    }

    function isBundleAccessCode(accessCode) {
        return /^BDL[A-Z0-9]{3,27}$/i.test(String(accessCode || '').trim());
    }

    function broadcastRefundReset() {
        try {
            const marker = Date.now().toString();
            localStorage.setItem(REFUND_RESET_KEY, marker);
            localStorage.setItem(REFUND_RESET_HANDLED_KEY, marker);
        } catch (e) {
            console.warn('⚠️ 写入退款重置标记失败:', e.message);
        }
    }

    function showRefundDialog() {
        console.log('🔄 显示退款弹窗...');

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            padding: 24px;
            background: rgba(15, 23, 42, 0.52);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            box-sizing: border-box;
        `;

        overlay.innerHTML = `
            <div id="refund-modal" style="
                background: #ffffff;
                border: 1px solid rgba(64, 137, 227, 0.16);
                border-radius: 28px;
                max-width: 480px;
                width: min(100%, 480px);
                overflow: hidden;
                box-shadow: 0 30px 80px rgba(15, 23, 42, 0.22);
                animation: modalAppear 0.3s ease-out;
            ">
                <div style="
                    padding: 28px 30px 22px;
                    background: #f8fbff;
                    border-bottom: 1px solid rgba(64, 137, 227, 0.12);
                ">
                    <h2 style="
                        color: #0f172a;
                        font-size: 28px;
                        line-height: 1.12;
                        font-weight: 800;
                        margin: 0;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    ">
                        <span aria-hidden="true" style="display: inline-flex; align-items: center; justify-content: center; width: 1.15em; height: 1.15em; color: #1457a5; flex: 0 0 auto;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">
                                <path d="M3 7h15a3 3 0 0 1 3 3v7a2 2 0 0 1-2 2H6a3 3 0 0 1-3-3V7z"></path>
                                <path d="M16 11h2"></path>
                                <path d="M7 3v4"></path>
                            </svg>
                        </span>
                        <span>申请退款</span>
                    </h2>
                </div>

                <div style="padding: 24px 30px 30px;">
                <div style="margin-bottom: 22px;">
                    <input 
                        type="text" 
                        id="refund-access-code-input"
                        placeholder="请输入您的访问码（如：WTHVEWWR36BM）"
                        style="
                            width: 100%;
                            min-height: 52px;
                            padding: 0 16px;
                            border: 1.5px solid rgba(64, 137, 227, 0.2);
                            background: #ffffff;
                            border-radius: 16px;
                            font-size: 16px;
                            font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
                            letter-spacing: 1px;
                            text-transform: uppercase;
                            transition: all 0.2s ease;
                            box-sizing: border-box;
                            color: #0f172a;
                        "
                        maxlength="20"
                    />
                </div>

                <div style="
                    background: #fff7ed;
                    border: 1px solid rgba(249, 115, 22, 0.24);
                    border-radius: 18px;
                    padding: 16px 18px;
                    margin-bottom: 26px;
                ">
                    <div style="
                        color: #c2410c;
                        font-weight: 700;
                        font-size: 13px;
                        margin-bottom: 8px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        <span aria-hidden="true" style="display: inline-flex; width: 1rem; height: 1rem; flex: 0 0 auto;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">
                                <path d="M12 9v4"></path>
                                <path d="M12 17h.01"></path>
                                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            </svg>
                        </span>
                        <span>退款须知</span>
                    </div>
                    <ul style="
                        color: #9a3412;
                        font-size: 12px;
                        line-height: 1.7;
                        margin: 0;
                        padding-left: 18px;
                    ">
                        <li>退款通常在1-3个工作日内到账</li>
                        <li>退款成功后访问码将立即失效</li>
                        <li>每个访问码只能申请一次退款</li>
                    </ul>
                </div>

                <div style="
                    display: flex;
                    gap: 12px;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <button id="cancel-refund-btn" style="
                        flex: 1;
                        min-height: 48px;
                        padding: 0 20px;
                        border: 1px solid rgba(64, 137, 227, 0.16);
                        background: #ffffff;
                        color: #1457a5;
                        border-radius: 999px;
                        font-weight: 700;
                        font-size: 14px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        box-shadow: 0 14px 30px rgba(64, 137, 227, 0.08);
                    ">
                        取消
                    </button>
                    <button id="submit-refund-btn" style="
                        flex: 2;
                        min-height: 48px;
                        padding: 0 24px;
                        background: #ea580c;
                        color: white;
                        border: none;
                        border-radius: 999px;
                        font-weight: 700;
                        font-size: 14px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        box-shadow: 0 18px 36px rgba(234, 88, 12, 0.24);
                        opacity: 1;
                    ">
                        <span id="submit-btn-text">提交退款申请</span>
                    </button>
                </div>
                </div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes modalAppear {
                from {
                    opacity: 0;
                    transform: scale(0.96) translateY(14px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            #refund-access-code-input:focus {
                border-color: #4089e3 !important;
                box-shadow: 0 0 0 4px rgba(64, 137, 227, 0.12) !important;
                outline: none !important;
            }

            #cancel-refund-btn:hover {
                border-color: rgba(64, 137, 227, 0.24);
                background: #f8fbff;
                transform: translateY(-1px);
                box-shadow: 0 18px 36px rgba(64, 137, 227, 0.12);
            }

            #submit-refund-btn:not(:disabled):hover {
                transform: translateY(-2px);
                background: #c2410c;
                box-shadow: 0 24px 42px rgba(194, 65, 12, 0.28);
            }

            #submit-refund-btn:not(:disabled) {
                opacity: 1;
            }

            @media (max-width: 640px) {
                #refund-modal {
                    border-radius: 24px !important;
                }

                #refund-modal > div:first-child {
                    padding: 24px 22px 18px !important;
                }

                #refund-modal > div:last-child {
                    padding: 20px 22px 24px !important;
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(overlay);
        setupModalEvents(overlay);

        setTimeout(() => {
            const input = document.getElementById('refund-access-code-input');
            if (input) input.focus();
        }, 100);
    }

    function setupModalEvents(overlay) {
        const submitBtn = overlay.querySelector('#submit-refund-btn');
        const cancelBtn = overlay.querySelector('#cancel-refund-btn');
        const input = overlay.querySelector('#refund-access-code-input');
        const btnText = overlay.querySelector('#submit-btn-text');

        if (submitBtn) {
            submitBtn.addEventListener('click', () => submitRefund(input, submitBtn, btnText));
        }

        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    submitRefund(input, submitBtn, btnText);
                }
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => closeModal(overlay));
        }

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal(overlay);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal(overlay);
            }
        });
    }

    function isRefundAlreadyCompleted(result) {
        if (!result) return false;
        const message = (result.error || result.message || '').toString();
        return /已退款|已全额退款|已经退款|可退款金额超过订单总金额|退款金额超过订单总金额/i.test(message);
    }


    async function submitRefund(inputElement, submitBtnElement, btnTextElement) {
        const input = inputElement || document.getElementById('refund-access-code-input');
        const submitBtn = submitBtnElement || document.getElementById('submit-refund-btn');
        const btnText = btnTextElement || document.getElementById('submit-btn-text');

        if (!input || !submitBtn) {
            console.error('❌ 重要元素未找到');
            return;
        }

        const accessCode = input.value.trim().toUpperCase();
        if (!accessCode) {
            showAlert('请输入访问码', 'error');
            return;
        }

        submitBtn.disabled = true;
        btnText.textContent = '处理中...';
        submitBtn.style.background = 'linear-gradient(135deg, #a0aec0 0%, #718096 100%)';

        try {
            const result = await requestUnifiedRefund(accessCode);

            if (result && result.success) {
                showSuccessResult(result.data || {}, accessCode);
            } else if (isRefundAlreadyCompleted(result)) {
                showSuccessResult(result.data || { access_code: accessCode }, accessCode);
            } else {
                showAlert(result && result.error ? result.error : '退款申请失败，请稍后重试', 'error');
            }
        } catch (error) {
            console.error('❌ 退款申请异常:', error);
            showAlert(`网络错误: ${error.message || '请检查网络连接后重试'}`, 'error');
        } finally {
            btnText.textContent = '提交退款申请';
            submitBtn.style.background = 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)';
            submitBtn.disabled = false;
        }
    }

    function isNotSingleCodeResponse(result, response) {
        if (response && (response.status === 404 || response.status === 400)) {
            if (result && (result.code === 'NOT_SINGLE_CODE' || result.error === 'NOT_SINGLE_CODE')) {
                return true;
            }
        }

        if (!result) return false;

        if (result.code === 'NOT_SINGLE_CODE') return true;
        if (result.error === 'NOT_SINGLE_CODE') return true;
        if (typeof result.error === 'string' && result.error.includes('NOT_SINGLE_CODE')) return true;
        if (typeof result.msg === 'string' && result.msg.includes('NOT_SINGLE_CODE')) return true;
        return false;
    }

    async function requestUnifiedRefund(accessCode) {
        const payload = {
            access_code: accessCode
        };

        if (isBundleAccessCode(accessCode)) {
            const bundleResp = await fetch(BUNDLE_REFUND_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Request-Source': 'IC-Studio-Refund-Bundle-Direct'
                },
                body: JSON.stringify(payload)
            });
            return await bundleResp.json();
        }

        const looksLikeSingle = /^(MEL|JPU|RHY|CHD|INT)[A-Z0-9]{12}$/.test(accessCode);

        // 非单件访问码：直接走完整版退款，避免 NOT_SINGLE_CODE 误判
        if (!looksLikeSingle) {
            const fullResp = await fetch(FULL_REFUND_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Request-Source': 'IC-Studio-Refund-Full-Direct'
                },
                body: JSON.stringify(payload)
            });
            return await fullResp.json();
        }

        // 单件访问码：先尝试单件退款
        const singleResp = await fetch(SINGLE_REFUND_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Request-Source': 'IC-Studio-Refund-Single-First'
            },
            body: JSON.stringify(payload)
        });

        const singleResult = await singleResp.json();

        if (singleResult && singleResult.success) {
            return singleResult;
        }

        if (isNotSingleCodeResponse(singleResult, singleResp)) {
            // 回退到完整版退款
            const fullResp = await fetch(FULL_REFUND_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Request-Source': 'IC-Studio-Refund-Full-Fallback'
                },
                body: JSON.stringify(payload)
            });

            return await fullResp.json();
        }

        return singleResult;
    }

    function showSuccessResult(data, accessCode) {
        const modal = document.getElementById('refund-modal');
        if (!modal) return;

        clearLocalAccessState();
        if (isBundleAccessCode(accessCode) && window.BundlePayment && typeof window.BundlePayment.clearBundleAccess === 'function') {
            window.BundlePayment.clearBundleAccess();
        }
        broadcastRefundReset();

        const orderNo = data.order_no || data.out_trade_no || data.order_id || '暂无';
        const refundAmount = data.refund_amount || data.amount || '1.00';
        const refundTime = data.refund_time ? new Date(data.refund_time) : new Date();
        const displayCode = data.access_code || accessCode || '暂无';

        modal.innerHTML = `
            <div style="text-align: center;">
                <div style="
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, #48bb78, #38a169);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px auto;
                ">
                    <div style="color: white; font-size: 40px;">✓</div>
                </div>

                <h2 style="
                    color: #2d3748;
                    font-size: 24px;
                    font-weight: 700;
                    margin: 0 0 15px 0;
                ">
                    🎉 退款申请成功！
                </h2>

                <div style="
                    background: #f0fff4;
                    border: 1px solid #9ae6b4;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                    text-align: left;
                ">
                    <div style="color: #2f855a; font-weight: 600; margin-bottom: 10px;">
                        📋 退款详情
                    </div>
                    <div style="color: #276749; font-size: 14px; line-height: 1.6;">
                        <p style="margin: 5px 0;">
                            <strong>访问码：</strong> ${displayCode}
                        </p>
                        <p style="margin: 5px 0;">
                            <strong>订单号：</strong> ${orderNo}
                        </p>
                        <p style="margin: 5px 0;">
                            <strong>退款金额：</strong> ¥${refundAmount}
                        </p>
                        <p style="margin: 5px 0;">
                            <strong>处理时间：</strong> ${refundTime.toLocaleString('zh-CN')}
                        </p>
                    </div>
                </div>

                <div style="
                    background: #e6fffa;
                    border: 1px solid #81e6d9;
                    border-radius: 8px;
                    padding: 15px;
                    margin: 20px 0;
                ">
                    <div style="color: #234e52; font-size: 13px; text-align: left;">
                        <strong style="color: #065f46;">💡 温馨提示：</strong><br>
                        • 退款已提交至支付平台处理<br>
                        • 通常1-3个工作日内到账<br>
                        • 该访问码已失效，无法再次使用<br>
                        • 如有问题请联系客服
                    </div>
                </div>

                <button id="success-confirm-btn" style="
                    width: 100%;
                    padding: 15px;
                    background: linear-gradient(135deg, #48bb78, #38a169);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 16px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 15px rgba(72, 187, 120, 0.3);
                ">
                    我知道了（将刷新页面）
                </button>
            </div>
        `;

        const confirmBtn = document.getElementById('success-confirm-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                const overlay = document.querySelector('[style*="z-index: 10000"]');
                closeModal(overlay);
                setTimeout(() => {
                    window.location.reload();
                }, 200);
            });
        }

        setTimeout(() => {
            window.location.reload();
        }, 1200);
    }

    function showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        const colors = {
            success: { bg: '#48bb78', border: '#38a169' },
            error: { bg: '#f56565', border: '#e53e3e' },
            info: { bg: '#4299e1', border: '#3182ce' }
        };

        const color = colors[type] || colors.info;

        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${color.bg};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            border: 2px solid ${color.border};
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            z-index: 20000;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;

        alertDiv.textContent = message;
        document.body.appendChild(alertDiv);

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.style.animation = 'slideOut 0.3s ease-in forwards';
                setTimeout(() => alertDiv.remove(), 300);
            }
        }, 3000);

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    function closeModal(overlay) {
        if (overlay && overlay.parentNode) {
            overlay.style.animation = 'fadeOut 0.2s ease-in forwards';
            setTimeout(() => overlay.remove(), 200);
        }

        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    function bindRefundButton() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bindRefundButton);
            return;
        }

        const refundBtn = document.getElementById('refund-btn');
        if (refundBtn) {
            console.log('✅ 找到退款按钮，绑定事件...');
            refundBtn.addEventListener('click', function(e) {
                e.preventDefault();
                showRefundDialog();
            });
        } else {
            console.warn('⚠️ 未找到退款按钮，DOM元素:', document.getElementById('refund-btn'));
        }
    }

    window.IC_Refund = {
        showDialog: showRefundDialog
    };

    console.log('🚀 统一退款处理器加载完成');
    bindRefundButton();

})();
