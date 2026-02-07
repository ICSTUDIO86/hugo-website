/**
 * IC Studio - 统一退款处理器（支持完整版 + 单件）
 * 规则：先尝试单件退款，不是单件访问码则回退到完整版退款
 */

(function() {
    'use strict';

    console.log('🔄 统一退款处理器初始化...');

    const SINGLE_REFUND_API_ENDPOINT = 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/refundSingleByAccessCode';
    const FULL_REFUND_API_ENDPOINT = 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/refundByAccessCode';
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
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        `;

        overlay.innerHTML = `
            <div id="refund-modal" style="
                background: white;
                border-radius: 16px;
                padding: 30px;
                max-width: 450px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: modalAppear 0.3s ease-out;
            ">
                <div style="text-align: center; margin-bottom: 25px;">
                    <h2 style="
                        color: #2d3748;
                        font-size: 24px;
                        font-weight: 700;
                        margin: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                    ">
                        🔄 申请退款
                    </h2>
                    <p style="
                        color: #718096;
                        font-size: 14px;
                        margin: 10px 0 0 0;
                    ">
                        请输入您的访问码申请退款
                    </p>
                </div>

                <div style="margin-bottom: 25px;">
                    <label style="
                        display: block;
                        color: #4a5568;
                        font-weight: 600;
                        margin-bottom: 8px;
                        font-size: 14px;
                    ">
                        访问码 *
                    </label>
                    <input 
                        type="text" 
                        id="refund-access-code-input"
                        placeholder="请输入您的访问码（如：WTHVEWWR36BM）"
                        style="
                            width: 100%;
                            padding: 12px 16px;
                            border: 2px solid #e2e8f0;
                            border-radius: 8px;
                            font-size: 16px;
                            font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
                            letter-spacing: 1px;
                            text-transform: uppercase;
                            transition: all 0.2s ease;
                            box-sizing: border-box;
                        "
                        maxlength="20"
                    />
                    <div id="input-hint" style="
                        font-size: 12px;
                        color: #a0aec0;
                        margin-top: 5px;
                    ">
                        访问码通常为6-20位大写字母和数字组合
                    </div>
                </div>

                <div style="
                    background: linear-gradient(135deg, #fed7d7, #feb2b2);
                    border: 1px solid #fc8181;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 25px;
                ">
                    <div style="
                        color: #c53030;
                        font-weight: 600;
                        font-size: 13px;
                        margin-bottom: 5px;
                    ">
                        ⚠️ 退款须知
                    </div>
                    <ul style="
                        color: #742a2a;
                        font-size: 12px;
                        margin: 0;
                        padding-left: 15px;
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
                ">
                    <button id="cancel-refund-btn" style="
                        flex: 1;
                        padding: 12px 24px;
                        border: 2px solid #e2e8f0;
                        background: white;
                        color: #4a5568;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 14px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    ">
                        取消
                    </button>
                    <button id="submit-refund-btn" style="
                        flex: 2;
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 14px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        box-shadow: 0 4px 15px rgba(66, 153, 225, 0.3);
                        opacity: 1;
                    ">
                        <span id="submit-btn-text">提交退款申请</span>
                    </button>
                </div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes modalAppear {
                from {
                    opacity: 0;
                    transform: scale(0.9) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            #refund-access-code-input:focus {
                border-color: #4299e1 !important;
                box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1) !important;
                outline: none !important;
            }

            #cancel-refund-btn:hover {
                border-color: #cbd5e0;
                background: #f7fafc;
            }

            #submit-refund-btn:not(:disabled):hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(66, 153, 225, 0.4);
            }

            #submit-refund-btn:not(:disabled) {
                opacity: 1;
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
