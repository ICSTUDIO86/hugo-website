/**
 * IC Studio - 退款弹窗测试工具
 * 用于测试各种退款状态的弹窗效果
 */

(function() {
    'use strict';
    
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
        
        @keyframes modalDisappear {
            from {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
            to {
                opacity: 0;
                transform: scale(0.9) translateY(-20px);
            }
        }
        
        .modal-appear {
            animation: modalAppear 0.3s ease-out forwards;
        }
        
        .modal-disappear {
            animation: modalDisappear 0.2s ease-in forwards;
        }
    `;
    document.head.appendChild(style);
    
    /**
     * 显示退款成功弹窗
     */
    function showRefundSuccessPopup(testData = {}) {
        console.log('🎉 显示退款成功弹窗...');
        
        const defaultData = {
            refundAmount: '48.00',
            accessCode: 'WTHVEWWR36BM',
            transactionId: 'TXN2025011234567',
            refundMethod: '支付宝原路退回'
        };
        
        const data = { ...defaultData, ...testData };
        
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
            <div class="modal-appear" style="
                background: white;
                border-radius: 16px;
                padding: 40px 30px;
                max-width: 480px;
                width: 90%;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
                text-align: center;
            ">
                <!-- 成功图标 -->
                <div style="
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #10b981, #059669);
                    margin: 0 auto 25px auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
                ">
                    <span style="
                        color: white;
                        font-size: 36px;
                        font-weight: bold;
                    ">✓</span>
                </div>
                
                <!-- 标题 -->
                <h2 style="
                    color: #065f46;
                    font-size: 28px;
                    font-weight: 700;
                    margin: 0 0 15px 0;
                    line-height: 1.2;
                ">
                    🎉 退款申请成功！
                </h2>
                
                <!-- 详细信息 -->
                <div style="
                    background: #f0fdf4;
                    border: 2px solid #bbf7d0;
                    border-radius: 12px;
                    padding: 20px;
                    margin: 25px 0;
                    text-align: left;
                ">
                    <div style="
                        display: grid;
                        gap: 12px;
                        font-size: 14px;
                        color: #065f46;
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 600;">退款金额：</span>
                            <span style="font-weight: 700; color: #dc2626; font-size: 16px;">¥${data.refundAmount}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 600;">访问码：</span>
                            <code style="
                                background: #dcfce7;
                                padding: 4px 8px;
                                border-radius: 6px;
                                font-family: 'SF Mono', 'Monaco', monospace;
                                font-weight: 600;
                                letter-spacing: 1px;
                            ">${data.accessCode}</code>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 600;">交易单号：</span>
                            <span style="font-family: 'SF Mono', monospace; font-size: 13px;">${data.transactionId}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 600;">退款方式：</span>
                            <span style="font-weight: 600; color: #1e40af;">${data.refundMethod}</span>
                        </div>
                    </div>
                </div>
                
                <!-- 温馨提示 -->
                <div style="
                    background: #eff6ff;
                    border: 1px solid #bfdbfe;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 25px;
                    text-align: left;
                ">
                    <div style="
                        display: flex;
                        align-items: flex-start;
                        gap: 10px;
                        color: #1e40af;
                        font-size: 14px;
                        line-height: 1.5;
                    ">
                        <span style="flex-shrink: 0; font-size: 16px;">ℹ️</span>
                        <div>
                            <p style="margin: 0 0 8px 0; font-weight: 600;">温馨提示：</p>
                            <ul style="margin: 0; padding-left: 15px; list-style: disc;">
                                <li>退款将在1-3个工作日内到账</li>
                                <li>访问码已失效，无法再次使用</li>
                                <li>如有疑问，请联系客服微信：igorchen86</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <!-- 按钮组 -->
                <div style="
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                ">
                    <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="
                        padding: 12px 24px;
                        background: #059669;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
                    " onmouseover="this.style.background='#047857'; this.style.transform='translateY(-1px)'" 
                       onmouseout="this.style.background='#059669'; this.style.transform='translateY(0)'">
                        确定
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // 点击遮罩层关闭
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
        
        return overlay;
    }
    
    /**
     * 显示退款失败弹窗
     */
    function showRefundFailPopup(errorMessage = '未找到对应的订单信息，请检查访问码是否正确') {
        console.log('❌ 显示退款失败弹窗...');
        
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
            <div class="modal-appear" style="
                background: white;
                border-radius: 16px;
                padding: 40px 30px;
                max-width: 450px;
                width: 90%;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
                text-align: center;
            ">
                <!-- 错误图标 -->
                <div style="
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    margin: 0 auto 25px auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
                ">
                    <span style="
                        color: white;
                        font-size: 36px;
                        font-weight: bold;
                    ">✗</span>
                </div>
                
                <!-- 标题 -->
                <h2 style="
                    color: #dc2626;
                    font-size: 24px;
                    font-weight: 700;
                    margin: 0 0 15px 0;
                ">
                    ❌ 退款申请失败
                </h2>
                
                <!-- 错误信息 -->
                <div style="
                    background: #fef2f2;
                    border: 2px solid #fecaca;
                    border-radius: 12px;
                    padding: 20px;
                    margin: 25px 0;
                    color: #991b1b;
                    font-size: 14px;
                    line-height: 1.5;
                ">
                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                        <span style="flex-shrink: 0;">⚠️</span>
                        <div style="text-align: left;">
                            <p style="margin: 0; font-weight: 600;">错误原因：</p>
                            <p style="margin: 8px 0 0 0;">${errorMessage}</p>
                        </div>
                    </div>
                </div>
                
                <!-- 解决建议 -->
                <div style="
                    background: #fffbeb;
                    border: 1px solid #fed7aa;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 25px;
                    text-align: left;
                ">
                    <div style="
                        display: flex;
                        align-items: flex-start;
                        gap: 10px;
                        color: #92400e;
                        font-size: 14px;
                        line-height: 1.5;
                    ">
                        <span style="flex-shrink: 0;">💡</span>
                        <div>
                            <p style="margin: 0 0 8px 0; font-weight: 600;">解决建议：</p>
                            <ul style="margin: 0; padding-left: 15px; list-style: disc;">
                                <li>请检查访问码是否输入正确</li>
                                <li>确认该访问码尚未申请过退款</li>
                                <li>联系客服微信：igorchen86</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <!-- 按钮组 -->
                <div style="
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                ">
                    <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="
                        padding: 12px 24px;
                        background: #dc2626;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
                    " onmouseover="this.style.background='#b91c1c'; this.style.transform='translateY(-1px)'" 
                       onmouseout="this.style.background='#dc2626'; this.style.transform='translateY(0)'">
                        确定
                    </button>
                    <button onclick="showRefundDialog(); this.closest('[style*=\"position: fixed\"]').remove()" style="
                        padding: 12px 24px;
                        background: #f3f4f6;
                        color: #374151;
                        border: 2px solid #d1d5db;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.background='#e5e7eb'" 
                       onmouseout="this.style.background='#f3f4f6'">
                        重新尝试
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
        
        return overlay;
    }
    
    /**
     * 显示处理中弹窗
     */
    function showRefundProcessingPopup() {
        console.log('⏳ 显示退款处理中弹窗...');
        
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
            <div class="modal-appear" style="
                background: white;
                border-radius: 16px;
                padding: 40px 30px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
                text-align: center;
            ">
                <!-- 加载图标 -->
                <div style="
                    width: 60px;
                    height: 60px;
                    border: 4px solid #e5e7eb;
                    border-top: 4px solid #3b82f6;
                    border-radius: 50%;
                    margin: 0 auto 25px auto;
                    animation: spin 1s linear infinite;
                "></div>
                
                <!-- 标题 -->
                <h2 style="
                    color: #1f2937;
                    font-size: 24px;
                    font-weight: 700;
                    margin: 0 0 15px 0;
                ">
                    ⏳ 正在处理退款申请
                </h2>
                
                <!-- 提示文字 -->
                <p style="
                    color: #6b7280;
                    font-size: 16px;
                    margin: 0 0 25px 0;
                    line-height: 1.5;
                ">
                    请稍候，我们正在为您处理退款申请...
                </p>
                
                <!-- 进度提示 -->
                <div style="
                    background: #f3f4f6;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 25px;
                ">
                    <div style="
                        font-size: 14px;
                        color: #4b5563;
                        text-align: left;
                        line-height: 1.6;
                    ">
                        <div style="margin-bottom: 8px;">✓ 验证访问码</div>
                        <div style="margin-bottom: 8px; color: #3b82f6; font-weight: 600;">⏳ 处理退款请求...</div>
                        <div style="color: #9ca3af;">◯ 更新订单状态</div>
                    </div>
                </div>
            </div>
        `;
        
        // 添加旋转动画
        const spinStyle = document.createElement('style');
        spinStyle.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(spinStyle);
        
        document.body.appendChild(overlay);
        
        return overlay;
    }
    
    // 将函数添加到全局作用域以便测试
    window.testRefundPopups = {
        success: showRefundSuccessPopup,
        fail: showRefundFailPopup,
        processing: showRefundProcessingPopup
    };
    
    // 添加快捷键测试
    document.addEventListener('keydown', function(e) {
        // Ctrl + Alt + R + S = 退款成功
        if (e.ctrlKey && e.altKey && e.key === 's') {
            e.preventDefault();
            showRefundSuccessPopup();
        }
        // Ctrl + Alt + R + F = 退款失败
        if (e.ctrlKey && e.altKey && e.key === 'f') {
            e.preventDefault();
            showRefundFailPopup();
        }
        // Ctrl + Alt + R + P = 处理中
        if (e.ctrlKey && e.altKey && e.key === 'p') {
            e.preventDefault();
            showRefundProcessingPopup();
        }
    });
    
    console.log('🎯 退款弹窗测试工具已加载！');
    console.log('📋 测试命令：');
    console.log('   - testRefundPopups.success() - 显示退款成功弹窗');
    console.log('   - testRefundPopups.fail() - 显示退款失败弹窗');
    console.log('   - testRefundPopups.processing() - 显示处理中弹窗');
    console.log('🎯 快捷键：');
    console.log('   - Ctrl + Alt + S = 退款成功');
    console.log('   - Ctrl + Alt + F = 退款失败');
    console.log('   - Ctrl + Alt + P = 处理中');
})();