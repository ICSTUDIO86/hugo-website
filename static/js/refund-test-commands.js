/**
 * IC Studio - 退款测试命令
 * 快速测试退款弹窗的简化命令集
 * 
 * 使用方法：
 * 1. 在浏览器控制台中粘贴此代码
 * 2. 调用以下命令：
 *    - showRefundSuccess() - 显示退款成功
 *    - showRefundFail() - 显示退款失败  
 *    - showRefundProcessing() - 显示处理中
 */

// 退款成功弹窗
function showRefundSuccess(amount = '1.00', accessCode = 'DEMO' + Math.random().toString(36).substr(2, 8).toUpperCase()) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center;
        z-index: 10000; backdrop-filter: blur(5px); animation: fadeIn 0.3s ease-out;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white; border-radius: 16px; padding: 40px 30px; max-width: 480px; width: 90%;
            box-shadow: 0 25px 80px rgba(0,0,0,0.4); text-align: center; animation: slideUp 0.3s ease-out;
        ">
            <!-- 成功图标 -->
            <div style="
                width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669);
                margin: 0 auto 25px auto; display: flex; align-items: center; justify-content: center;
                box-shadow: 0 8px 25px rgba(16,185,129,0.3);
            ">
                <span style="color: white; font-size: 36px; font-weight: bold;">✓</span>
            </div>
            
            <h2 style="color: #065f46; font-size: 28px; font-weight: 700; margin: 0 0 15px 0;">
                🎉 退款申请成功！
            </h2>
            
            <div style="
                background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 12px;
                padding: 20px; margin: 25px 0; text-align: left;
            ">
                <div style="display: grid; gap: 12px; font-size: 14px; color: #065f46;">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="font-weight: 600;">退款金额：</span>
                        <span style="font-weight: 700; color: #dc2626; font-size: 16px;">¥${amount}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="font-weight: 600;">访问码：</span>
                        <code style="
                            background: #dcfce7; padding: 4px 8px; border-radius: 6px;
                            font-family: monospace; font-weight: 600; letter-spacing: 1px;
                        ">${accessCode}</code>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="font-weight: 600;">退款方式：</span>
                        <span style="font-weight: 600; color: #1e40af;">支付宝原路退回</span>
                    </div>
                </div>
            </div>
            
            <div style="
                background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;
                padding: 15px; margin-bottom: 25px; text-align: left; color: #1e40af; font-size: 14px;
            ">
                <p style="margin: 0 0 8px 0; font-weight: 600;">💡 温馨提示：</p>
                <ul style="margin: 0; padding-left: 15px;">
                    <li>退款将在1-3个工作日内到账</li>
                    <li>访问码已失效，无法再次使用</li>
                    <li>如有疑问，请联系客服微信：igorchen86</li>
                </ul>
            </div>
            
            <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" style="
                padding: 12px 24px; background: #059669; color: white; border: none;
                border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer;
                transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(5,150,105,0.3);
            ">确定</button>
        </div>
    `;
    
    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(modal);
    modal.onclick = e => e.target === modal && modal.remove();
    console.log('🎉 退款成功弹窗已显示');
}

// 退款失败弹窗
function showRefundFail(errorMsg = '未找到对应的订单信息，请检查访问码是否正确') {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center;
        z-index: 10000; backdrop-filter: blur(5px); animation: fadeIn 0.3s ease-out;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white; border-radius: 16px; padding: 40px 30px; max-width: 450px; width: 90%;
            box-shadow: 0 25px 80px rgba(0,0,0,0.4); text-align: center; animation: slideUp 0.3s ease-out;
        ">
            <!-- 错误图标 -->
            <div style="
                width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #ef4444, #dc2626);
                margin: 0 auto 25px auto; display: flex; align-items: center; justify-content: center;
                box-shadow: 0 8px 25px rgba(239,68,68,0.3);
            ">
                <span style="color: white; font-size: 36px; font-weight: bold;">✗</span>
            </div>
            
            <h2 style="color: #dc2626; font-size: 24px; font-weight: 700; margin: 0 0 15px 0;">
                ❌ 退款申请失败
            </h2>
            
            <div style="
                background: #fef2f2; border: 2px solid #fecaca; border-radius: 12px;
                padding: 20px; margin: 25px 0; color: #991b1b; font-size: 14px;
            ">
                <div style="display: flex; align-items: flex-start; gap: 10px; text-align: left;">
                    <span style="flex-shrink: 0;">⚠️</span>
                    <div>
                        <p style="margin: 0; font-weight: 600;">错误原因：</p>
                        <p style="margin: 8px 0 0 0;">${errorMsg}</p>
                    </div>
                </div>
            </div>
            
            <div style="
                background: #fffbeb; border: 1px solid #fed7aa; border-radius: 8px;
                padding: 15px; margin-bottom: 25px; text-align: left; color: #92400e; font-size: 14px;
            ">
                <p style="margin: 0 0 8px 0; font-weight: 600;">💡 解决建议：</p>
                <ul style="margin: 0; padding-left: 15px;">
                    <li>请检查访问码是否输入正确</li>
                    <li>确认该访问码尚未申请过退款</li>
                    <li>联系客服微信：igorchen86</li>
                </ul>
            </div>
            
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" style="
                    padding: 12px 24px; background: #dc2626; color: white; border: none;
                    border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer;
                    transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(220,38,38,0.3);
                ">确定</button>
                <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" style="
                    padding: 12px 24px; background: #f3f4f6; color: #374151; border: 2px solid #d1d5db;
                    border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer;
                ">重试</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.onclick = e => e.target === modal && modal.remove();
    console.log('❌ 退款失败弹窗已显示');
}

// 处理中弹窗
function showRefundProcessing() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center;
        z-index: 10000; backdrop-filter: blur(5px); animation: fadeIn 0.3s ease-out;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white; border-radius: 16px; padding: 40px 30px; max-width: 400px; width: 90%;
            box-shadow: 0 25px 80px rgba(0,0,0,0.4); text-align: center; animation: slideUp 0.3s ease-out;
        ">
            <!-- 加载图标 -->
            <div style="
                width: 60px; height: 60px; border: 4px solid #e5e7eb; border-top: 4px solid #3b82f6;
                border-radius: 50%; margin: 0 auto 25px auto; animation: spin 1s linear infinite;
            "></div>
            
            <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 15px 0;">
                ⏳ 正在处理退款申请
            </h2>
            
            <p style="color: #6b7280; font-size: 16px; margin: 0 0 25px 0;">
                请稍候，我们正在为您处理退款申请...
            </p>
            
            <div style="background: #f3f4f6; border-radius: 8px; padding: 15px; font-size: 14px; color: #4b5563; text-align: left;">
                <div style="margin-bottom: 8px;">✓ 验证访问码</div>
                <div style="margin-bottom: 8px; color: #3b82f6; font-weight: 600;">⏳ 处理退款请求...</div>
                <div style="color: #9ca3af;">◯ 更新订单状态</div>
            </div>
            
            <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" style="
                margin-top: 20px; padding: 8px 16px; background: #6b7280; color: white;
                border: none; border-radius: 6px; font-size: 14px; cursor: pointer;
            ">取消</button>
        </div>
    `;
    
    // 添加旋转动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(modal);
    modal.onclick = e => e.target === modal && modal.remove();
    console.log('⏳ 处理中弹窗已显示');
    
    return modal;
}

// 测试完整流程
function testRefundFlow() {
    console.log('🎬 开始测试完整退款流程...');
    
    const processing = showRefundProcessing();
    
    setTimeout(() => {
        processing.remove();
        showRefundSuccess();
        console.log('✅ 流程测试完成：处理中 → 成功');
    }, 2000);
}

// 显示帮助信息
console.log(`
🎯 IC Studio 退款弹窗测试命令已加载！

📋 可用命令：
   showRefundSuccess()     - 显示退款成功弹窗
   showRefundFail()        - 显示退款失败弹窗  
   showRefundProcessing()  - 显示处理中弹窗
   testRefundFlow()        - 测试完整流程

🛠️ 自定义参数：
   showRefundSuccess('99.99', 'CUSTOM123') - 自定义金额和访问码
   showRefundFail('自定义错误信息')          - 自定义错误信息

💡 使用示例：
   showRefundSuccess()     // 显示默认成功弹窗
   showRefundFail()        // 显示默认失败弹窗
   testRefundFlow()        // 测试: 处理中 → 成功
`);