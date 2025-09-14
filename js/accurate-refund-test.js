/**
 * IC Studio - 真实退款弹窗测试
 * 与生产环境完全一致的弹窗测试
 */

// 真实的退款成功弹窗（与生产环境100%一致）
function showRealRefundSuccess(data = {
    access_code: 'DEMO' + Math.random().toString(36).substr(2, 8).toUpperCase(),
    order_no: 'ORDER' + Date.now(),
    refund_amount: '1.00',
    refund_time: new Date()
}) {
    
    // 创建遮罩层（与真实代码一致）
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
    
    // 创建弹窗内容（与真实代码完全一致）
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
        </div>
    `;
    
    // 添加动画样式
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
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(overlay);
    
    // 绑定确认按钮事件
    const confirmBtn = document.getElementById('success-confirm-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            overlay.remove();
        });
    }
    
    // 点击遮罩层关闭
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
    
    console.log('🎉 真实退款成功弹窗已显示');
    return overlay;
}

// 真实的申请退款弹窗（输入访问码的弹窗）
function showRealRefundDialog() {
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
    
    // 创建弹窗内容（与真实代码完全一致）
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
                ">
                    <span id="submit-btn-text">提交退款申请</span>
                </button>
            </div>
        </div>
    `;
    
    // 添加CSS动画和样式
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
        
        #submit-refund-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(66, 153, 225, 0.4);
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(overlay);
    
    // 绑定事件
    const cancelBtn = document.getElementById('cancel-refund-btn');
    const submitBtn = document.getElementById('submit-refund-btn');
    const input = document.getElementById('refund-access-code-input');
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => overlay.remove());
    }
    
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            const accessCode = input.value.trim().toUpperCase();
            if (!accessCode) {
                alert('请输入访问码');
                return;
            }
            // 模拟成功，关闭当前弹窗并显示成功弹窗
            overlay.remove();
            setTimeout(() => {
                showRealRefundSuccess({
                    access_code: accessCode,
                    order_no: 'ORDER2025011234567',
                    refund_amount: '1.00',
                    refund_time: new Date()
                });
            }, 500);
        });
    }
    
    // 点击遮罩层关闭
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
    
    // 自动聚焦输入框
    setTimeout(() => {
        if (input) input.focus();
    }, 300);
    
    console.log('🔄 真实申请退款弹窗已显示');
    return overlay;
}

// 将函数添加到全局作用域
window.showRealRefundSuccess = showRealRefundSuccess;
window.showRealRefundDialog = showRealRefundDialog;

console.log(`
🎯 真实退款弹窗测试已加载！（与生产环境100%一致）

📋 可用命令：
   showRealRefundSuccess()  - 显示真实的退款成功弹窗
   showRealRefundDialog()   - 显示真实的申请退款弹窗

🛠️ 自定义数据：
   showRealRefundSuccess({
       access_code: 'CUSTOM123',
       order_no: 'ORDER987654321',
       refund_amount: '99.99',
       refund_time: new Date()
   })

💡 主要区别：
   - 成功图标：绿色渐变圆形，内有白色✓
   - 详情区域：绿色背景，包含订单号、处理时间
   - 按钮样式：绿色渐变，文字为"我知道了"
   - 整体布局：与生产环境完全一致
`);