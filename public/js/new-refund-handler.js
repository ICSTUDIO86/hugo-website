/**
 * IC Studio - 新的退款处理器
 * 基于Z-Pay官方API，只支持访问码退款
 * 执行三个动作：1. Z-Pay退款 2. 更新codes状态 3. 更新orders信息
 */

(function() {
    'use strict';
    
    console.log('🔄 新的退款处理器初始化...');
    
    // 云函数API端点 - 使用已有的markRefund端点
    const REFUND_API_ENDPOINT = 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/markRefund';
    
    /**
     * 显示退款弹窗（只支持访问码）
     */
    function showRefundDialog() {
        console.log('🔄 显示退款弹窗...');
        
        // 创建遮罩层
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
        
        // 创建弹窗内容
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
                <!-- 标题 -->
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
                
                <!-- 输入表单 -->
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
                
                <!-- 重要提醒 -->
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
                
                <!-- 按钮组 -->
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
        
        // 添加CSS动画
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
        
        // 添加到页面
        document.body.appendChild(overlay);
        
        // 绑定事件
        setupModalEvents(overlay);
        
        // 自动聚焦到输入框
        setTimeout(() => {
            const input = document.getElementById('refund-access-code-input');
            if (input) input.focus();
        }, 100);
    }
    
    /**
     * 设置弹窗事件监听
     */
    function setupModalEvents(overlay) {
        const input = document.getElementById('refund-access-code-input');
        const submitBtn = document.getElementById('submit-refund-btn');
        const cancelBtn = document.getElementById('cancel-refund-btn');
        const hint = document.getElementById('input-hint');
        const btnText = document.getElementById('submit-btn-text');
        
        // 输入验证
        console.log('🔧 设置输入验证事件监听器', { 
            inputExists: !!input, 
            inputId: input ? input.id : 'no input',
            allInputs: document.querySelectorAll('input').length,
            allAccessCodeInputs: document.querySelectorAll('#refund-access-code-input').length
        });
        
        if (input) {
            console.log('✅ 绑定 input 事件监听器到:', input.id);
            input.addEventListener('input', function() {
                const value = this.value.toUpperCase();
                console.log('📝 输入事件触发:', { 
                    originalValue: this.value, 
                    upperCaseValue: value,
                    beforeAssign: this.value
                });
                this.value = value;
                console.log('📝 赋值后:', this.value);
                
                // 验证访问码格式
                const isValid = /^[A-Z0-9]{6,20}$/.test(value);
                
                if (isValid) {
                    this.style.borderColor = '#48bb78';
                    this.style.backgroundColor = '#f0fff4';
                    hint.style.color = '#38a169';
                    hint.textContent = '✅ 访问码格式正确';
                    
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                } else {
                    this.style.borderColor = value.length > 0 ? '#f56565' : '#e2e8f0';
                    this.style.backgroundColor = value.length > 0 ? '#fffaf0' : 'white';
                    hint.style.color = value.length > 0 ? '#e53e3e' : '#a0aec0';
                    hint.textContent = value.length > 0 ? 
                        '❌ 访问码格式不正确' : 
                        '访问码通常为6-20位大写字母和数字组合';
                    
                    submitBtn.disabled = true;
                    submitBtn.style.opacity = '0.5';
                }
            });
            
            // 回车提交
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !submitBtn.disabled) {
                    submitRefund(input, submitBtn, btnText);
                }
            });
        }
        
        // 提交按钮
        if (submitBtn) {
            console.log('✅ 绑定提交按钮点击事件');
            submitBtn.addEventListener('click', function(e) {
                console.log('🖱️ 提交按钮被点击', { disabled: submitBtn.disabled, event: e });
                e.preventDefault();
                submitRefund(input, submitBtn, btnText);
            });
        } else {
            console.error('❌ 提交按钮未找到');
        }
        
        // 取消按钮
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                closeModal(overlay);
            });
        }
        
        // 点击遮罩关闭
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                closeModal(overlay);
            }
        });
        
        // ESC键关闭
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeModal(overlay);
            }
        });
    }
    
    /**
     * 提交退款申请
     */
    async function submitRefund(inputElement, submitBtnElement, btnTextElement) {
        console.log('🔥 submitRefund 函数被调用');
        
        // 优先使用传入的元素引用，如果没有则重新获取
        const input = inputElement || document.getElementById('refund-access-code-input');
        const submitBtn = submitBtnElement || document.getElementById('submit-refund-btn');
        const btnText = btnTextElement || document.getElementById('submit-btn-text');
        
        console.log('🔍 元素检查:', { input, submitBtn, btnText });
        console.log('🔍 按钮状态:', submitBtn ? { disabled: submitBtn.disabled, opacity: submitBtn.style.opacity } : 'button not found');
        console.log('🔍 输入框详情:', input ? { 
            id: input.id, 
            tagName: input.tagName,
            value: input.value,
            hasValue: !!input.value,
            getAttribute: input.getAttribute('id')
        } : 'input not found');
        
        console.log('🔍 直接输出值:');
        console.log('  - input.value:', input.value);
        console.log('  - input.value.length:', input.value.length);
        console.log('  - typeof input.value:', typeof input.value);
        
        // 尝试直接通过ID重新获取
        const freshInput = document.getElementById('refund-access-code-input');
        console.log('🔄 输入框状态:', {
            value: freshInput ? freshInput.value : 'none',
            uniqueElements: document.querySelectorAll('#refund-access-code-input').length
        });
        
        if (!input || !submitBtn) {
            console.error('❌ 重要元素未找到');
            return;
        }
        
        const accessCode = input.value.trim().toUpperCase();
        
        console.log('🔍 访问码详细信息:', { 
            rawValue: input.value, 
            trimmed: input.value.trim(), 
            upperCased: accessCode,
            length: accessCode.length,
            isEmpty: !accessCode
        });
        
        if (!accessCode) {
            console.error('❌ 访问码为空');
            showAlert('请输入访问码', 'error');
            return;
        }
        
        // 显示加载状态
        submitBtn.disabled = true;
        btnText.textContent = '处理中...';
        submitBtn.style.background = 'linear-gradient(135deg, #a0aec0 0%, #718096 100%)';
        
        try {
            console.log('📤 提交退款申请:', accessCode);
            
            // 调用云函数
            const response = await fetch(REFUND_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Request-Source': 'IC-Studio-New-Refund-System'
                },
                body: JSON.stringify({
                    access_code: accessCode
                })
            });
            
            const result = await response.json();
            console.log('📥 退款结果:', result);
            
            if (result.success) {
                // 成功
                showSuccessResult(result.data);
            } else {
                // 失败
                showAlert(result.error || '退款申请失败，请稍后重试', 'error');
            }
            
        } catch (error) {
            console.error('❌ 退款申请异常:', error);
            showAlert(`网络错误: ${error.message || '请检查网络连接后重试'}`, 'error');
        } finally {
            // 恢复按钮状态
            btnText.textContent = '提交退款申请';
            submitBtn.style.background = 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)';
            submitBtn.disabled = false;
        }
    }
    
    /**
     * 显示成功结果
     */
    function showSuccessResult(data) {
        const modal = document.getElementById('refund-modal');
        if (!modal) return;
        
        modal.innerHTML = `
            <div style="text-align: center;">
                <!-- 成功图标 -->
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
                
                <!-- 成功标题 -->
                <h2 style="
                    color: #2d3748;
                    font-size: 24px;
                    font-weight: 700;
                    margin: 0 0 15px 0;
                ">
                    🎉 退款申请成功！
                </h2>
                
                <!-- 详细信息 -->
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
                            <strong>访问码：</strong> ${data.access_code}
                        </p>
                        <p style="margin: 5px 0;">
                            <strong>订单号：</strong> ${data.order_no}
                        </p>
                        <p style="margin: 5px 0;">
                            <strong>退款金额：</strong> ¥${data.refund_amount}
                        </p>
                        <p style="margin: 5px 0;">
                            <strong>处理时间：</strong> ${new Date(data.refund_time).toLocaleString('zh-CN')}
                        </p>
                    </div>
                </div>
                
                <!-- 温馨提示 -->
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
                
                <!-- 确认按钮 -->
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
                    我知道了
                </button>
            </div>
        `;
        
        // 绑定确认按钮事件
        const confirmBtn = document.getElementById('success-confirm-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                const overlay = document.querySelector('[style*="z-index: 10000"]');
                closeModal(overlay);
            });
        }
    }
    
    /**
     * 显示提示信息
     */
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
        
        // 3秒后自动移除
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.style.animation = 'slideOut 0.3s ease-in forwards';
                setTimeout(() => alertDiv.remove(), 300);
            }
        }, 3000);
        
        // 添加动画样式
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
    
    /**
     * 关闭弹窗
     */
    function closeModal(overlay) {
        if (overlay && overlay.parentNode) {
            overlay.style.animation = 'fadeOut 0.2s ease-in forwards';
            setTimeout(() => overlay.remove(), 200);
        }
        
        // 添加淡出动画
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * 绑定退款按钮事件
     */
    function bindRefundButton() {
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bindRefundButton);
            return;
        }
        
        const refundBtn = document.getElementById('refund-btn');
        if (refundBtn) {
            console.log('✅ 找到退款按钮，绑定事件...');
            refundBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('🔄 退款按钮被点击');
                showRefundDialog();
            });
        } else {
            console.warn('⚠️ 未找到退款按钮，DOM元素:', document.getElementById('refund-btn'));
            console.log('🔍 所有ID为refund的元素:', document.querySelectorAll('[id*="refund"]'));
            console.log('🔍 页面所有按钮:', document.querySelectorAll('button'));
        }
    }
    
    // 暴露全局函数（用于测试）
    window.IC_Refund = {
        showDialog: showRefundDialog
    };
    
    // 初始化
    console.log('🚀 新的退款处理器加载完成');
    bindRefundButton();
    
})();