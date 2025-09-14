/**
 * IC Studio - 退款处理器
 * 专门处理Z-Pay退款功能
 */

(function() {
    'use strict';
    
    console.log('🔄 退款处理器开始初始化...');
    
    // MD5签名算法
    function md5(str) {
        // 简化的MD5实现，实际项目中使用crypto-js库
        return CryptoJS.MD5(str).toString().toLowerCase();
    }
    
    // Z-Pay退款API签名生成
    function generateZPaySign(params, key) {
        // 1. 按参数名ASCII码从小到大排序，排除sign、sign_type和空值
        const sortedKeys = Object.keys(params)
            .filter(k => k !== 'sign' && k !== 'sign_type' && params[k] !== '' && params[k] !== null && params[k] !== undefined)
            .sort();
        
        // 2. 拼接成URL键值对格式
        const queryString = sortedKeys.map(k => `${k}=${params[k]}`).join('&');
        
        // 3. 与商户密钥拼接并MD5加密
        const signString = queryString + key;
        return md5(signString);
    }
    
    // 退款对话框
    function showRefundDialog() {
        console.log('🔄 打开退款对话框...');
        
        // 创建退款弹窗
        const refundModal = document.createElement('div');
        refundModal.style.cssText = `
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
        `;
        
        refundModal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 16px; max-width: 500px; width: 90%; position: relative; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);">
                <button onclick="this.parentElement.parentElement.remove()" style="
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    background: none;
                    border: none;
                    font-size: 24px;
                    color: #999;
                    cursor: pointer;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: background 0.2s;
                " onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='none'">×</button>
                
                <h2 style="color: #333; margin-bottom: 20px; text-align: center;">🔄 申请退款</h2>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; color: #666; margin-bottom: 8px; font-weight: 600;">选择退款方式：</label>
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <label style="display: flex; align-items: center; padding: 8px 15px; border: 2px solid #e2e8f0; border-radius: 8px; cursor: pointer; background: white; transition: all 0.2s;">
                            <input type="radio" name="refund-type" value="order" checked style="margin-right: 8px;">
                            <span style="color: #333; font-size: 14px;">使用订单号</span>
                        </label>
                        <label style="display: flex; align-items: center; padding: 8px 15px; border: 2px solid #e2e8f0; border-radius: 8px; cursor: pointer; background: white; transition: all 0.2s;">
                            <input type="radio" name="refund-type" value="access" style="margin-right: 8px;">
                            <span style="color: #333; font-size: 14px;">使用访问码</span>
                        </label>
                    </div>
                </div>
                
                <div id="order-input-section" style="margin-bottom: 20px;">
                    <label style="display: block; color: #666; margin-bottom: 8px; font-weight: 600;">订单号：</label>
                    <input type="text" id="refund-order-no" placeholder="请输入您的订单号 (如: IC175744620182226801)" 
                           style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: monospace; box-sizing: border-box;"
                           oninput="window.validateRefundForm && window.validateRefundForm()">
                    <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">订单号可在支付成功页面或邮件中找到</p>
                </div>
                
                <div id="access-input-section" style="margin-bottom: 20px; display: none;">
                    <label style="display: block; color: #666; margin-bottom: 8px; font-weight: 600;">访问码：</label>
                    <input type="text" id="refund-access-code" placeholder="请输入您的访问码 (如: A1B2C3D4E5F6)" 
                           style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: monospace; text-transform: uppercase; box-sizing: border-box;"
                           oninput="window.validateRefundForm && window.validateRefundForm()">
                    <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">访问码可在购买确认邮件中找到</p>
                </div>
                
                <div style="margin-bottom: 25px;">
                    <label style="display: block; color: #666; margin-bottom: 8px; font-weight: 600;">退款原因（可选）：</label>
                    <textarea id="refund-detail" placeholder="请详细描述您遇到的问题或退款原因..." 
                              style="width: 100%; height: 80px; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px; resize: vertical; box-sizing: border-box;"></textarea>
                </div>
                
                <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h4 style="color: #d69e2e; margin: 0 0 10px 0; font-size: 14px;">⚠️ 退款须知</h4>
                    <ul style="color: #744210; font-size: 13px; margin: 0; padding-left: 20px;">
                        <li>仅支持购买后7天内的退款申请</li>
                        <li>退款将原路返回到您的支付账户</li>
                        <li>处理时间：1-3个工作日</li>
                        <li>如有疑问，请联系客服：service@icstudio.club</li>
                    </ul>
                </div>
                
                <div style="text-align: center;">
                    <button id="submit-refund-btn" onclick="window.submitRefund && window.submitRefund()" disabled
                            style="background: #e2e8f0; color: #a0aec0; padding: 15px 40px; border: none; border-radius: 8px; font-weight: 600; font-size: 16px; cursor: not-allowed; transition: all 0.3s ease;">
                        提交退款申请
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(refundModal);
        
        // 绑定单选按钮事件
        const radioButtons = refundModal.querySelectorAll('input[name="refund-type"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', function() {
                const orderSection = document.getElementById('order-input-section');
                const accessSection = document.getElementById('access-input-section');
                const radioLabels = refundModal.querySelectorAll('label');
                
                // 重置所有标签样式
                radioLabels.forEach(label => {
                    if (label.querySelector('input[type="radio"]')) {
                        label.style.borderColor = '#e2e8f0';
                        label.style.background = 'white';
                    }
                });
                
                if (this.value === 'order') {
                    orderSection.style.display = 'block';
                    accessSection.style.display = 'none';
                    // 清空访问码输入
                    document.getElementById('refund-access-code').value = '';
                    // 高亮当前选中项
                    this.parentElement.style.borderColor = '#3182ce';
                    this.parentElement.style.background = '#ebf8ff';
                } else if (this.value === 'access') {
                    orderSection.style.display = 'none';
                    accessSection.style.display = 'block';
                    // 清空订单号输入
                    document.getElementById('refund-order-no').value = '';
                    // 高亮当前选中项
                    this.parentElement.style.borderColor = '#3182ce';
                    this.parentElement.style.background = '#ebf8ff';
                }
                
                // 重新验证表单
                validateRefundForm();
            });
        });
        
        // 设置默认选中状态样式
        const defaultRadio = refundModal.querySelector('input[name="refund-type"]:checked');
        if (defaultRadio) {
            defaultRadio.parentElement.style.borderColor = '#3182ce';
            defaultRadio.parentElement.style.background = '#ebf8ff';
        }
        
        console.log('✅ 退款对话框已显示');
    }
    
    // 表单验证
    function validateRefundForm() {
        const refundType = document.querySelector('input[name="refund-type"]:checked')?.value;
        const orderNo = document.getElementById('refund-order-no')?.value.trim() || '';
        const accessCode = document.getElementById('refund-access-code')?.value.trim() || '';
        const submitBtn = document.getElementById('submit-refund-btn');
        
        let isValid = false;
        
        if (refundType === 'order') {
            // 验证订单号格式 (至少10位字符)
            isValid = orderNo.length >= 10;
        } else if (refundType === 'access') {
            // 验证访问码格式 (6-20位字符，支持字母数字)
            isValid = /^[A-Z0-9]{6,20}$/i.test(accessCode);
        }
        
        if (isValid && submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.background = 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)';
            submitBtn.style.color = 'white';
            submitBtn.style.cursor = 'pointer';
        } else if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.background = '#e2e8f0';
            submitBtn.style.color = '#a0aec0';
            submitBtn.style.cursor = 'not-allowed';
        }
    }
    
    // 提交退款 - 使用数据驱动的退款标记系统
    async function submitRefund() {
        const refundType = document.querySelector('input[name="refund-type"]:checked')?.value;
        const orderNo = document.getElementById('refund-order-no')?.value.trim() || '';
        const accessCode = document.getElementById('refund-access-code')?.value.trim() || '';
        const detail = document.getElementById('refund-detail')?.value.trim() || '';
        const submitBtn = document.getElementById('submit-refund-btn');
        
        // 基本验证
        if (refundType === 'order' && !orderNo) {
            alert('请输入订单号');
            return;
        } else if (refundType === 'access' && !accessCode) {
            alert('请输入访问码');
            return;
        }
        
        // 显示处理中状态
        submitBtn.innerHTML = '📝 标记退款中...';
        submitBtn.disabled = true;
        submitBtn.style.background = '#e2e8f0';
        submitBtn.style.cursor = 'not-allowed';
        
        try {
            console.log('📝 使用数据驱动退款标记系统');
            
            // 构建退款标记请求参数
            const refundParams = {
                reason: detail || '用户主动申请退款',
                user_info: {
                    request_time: new Date().toISOString(),
                    user_agent: navigator.userAgent,
                    source: 'web_interface'
                }
            };
            
            // 根据退款类型添加相应参数
            if (refundType === 'access') {
                refundParams.access_code = accessCode.toUpperCase();
                console.log('🔄 数据驱动退款: 访问码标记', { accessCode: accessCode.toUpperCase() });
            } else {
                refundParams.order_no = orderNo;
                console.log('🔄 数据驱动退款: 订单号标记', { orderNo });
            }
            
            // 调用数据驱动退款标记系统
            let result;
            try {
                // 使用新的数据驱动退款标记函数
                const response = await fetch('https://cloud1-4g1r5ho01a0cfd85.service.tcloudbase.com/markRefund', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Request-Source': 'IC-Studio-DataDriven-Refund'
                    },
                    body: JSON.stringify(refundParams)
                });
                
                if (!response.ok) {
                    throw new Error(`标记系统HTTP错误: ${response.status}`);
                }
                
                result = await response.json();
                console.log('📝 退款标记结果:', result);
                
            } catch (markSystemError) {
                console.warn('⚠️ 数据驱动退款系统暂不可用，降级到原系统:', markSystemError.message);
                
                // 降级到原退款系统
                const fallbackUrl = refundType === 'access' 
                    ? 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/refundByAccessCode'
                    : 'https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/refundByAccessCode';
                
                const fallbackParams = refundType === 'access' 
                    ? {
                        access_code: accessCode.toUpperCase(),
                        reason: '用户主动退款',
                        detail: detail
                      }
                    : {
                        order_no: orderNo,
                        reason: '用户主动退款',
                        detail: detail
                      };
                
                const fallbackResponse = await fetch(fallbackUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Request-Source': `IC-Studio-Fallback-${refundType === 'access' ? 'AccessCode' : 'OrderNumber'}`
                    },
                    body: JSON.stringify(fallbackParams)
                });
                
                result = await fallbackResponse.json();
                console.log('💰 原系统退款结果:', result);
            }
            
            // 判断退款结果（两种方式都使用云函数，返回格式一致）
            const isSuccess = result.success;
            console.log('🔍 DEBUG: Final isSuccess check:', isSuccess);
            console.log('🔍 DEBUG: Complete result object:', JSON.stringify(result, null, 2));
            
            if (isSuccess) {
                // 退款成功
                document.querySelector('[style*="position: fixed"]').remove();
                
                let successData;
                
                // 检查是否是数据驱动退款标记系统的响应
                if (result.code === 'REFUND_MARKED_SUCCESS') {
                    // 数据驱动退款标记成功
                    successData = {
                        success: true,
                        out_trade_no: result.data?.order_no || '已标记',
                        message: '✅ 退款已成功标记，Z-Pay将在5分钟内自动处理退款',
                        refund_type: 'data_driven',
                        processing_time: '5分钟内自动处理',
                        marked_time: result.data?.marked_time,
                        refund_amount: result.data?.amount,
                        access_codes: result.data?.access_codes,
                        status: result.data?.status,
                        awaiting_zpay: true
                    };
                } else if (result.data && result.data.request_id) {
                    // 新自动退款系统响应格式
                    successData = {
                        success: true,
                        out_trade_no: result.data.order_no,
                        message: result.message || '🤖 自动退款处理成功',
                        refund_type: 'auto_system_v2',
                        processing_time: '实时处理',
                        request_id: result.data.request_id,
                        refund_amount: result.data.refund_amount,
                        auto_processed: true,
                        zpay_status: result.data.zpay_status
                    };
                } else if (refundType === 'access') {
                    // 原系统访问码退款成功
                    successData = {
                        success: true,
                        out_trade_no: result.data?.out_trade_no || '已处理',
                        message: result.message || '退款申请已提交，访问码已失效',
                        refund_type: result.data?.refund_type || 'access_code',
                        processing_time: result.data?.processing_time || '1-3个工作日'
                    };
                } else {
                    // 原系统订单号退款成功
                    successData = {
                        success: true,
                        out_trade_no: orderNo,
                        message: result.msg || '退款申请已提交',
                        refund_type: 'order_number',
                        processing_time: '1-3个工作日'
                    };
                }
                
                showRefundSuccessDialog(successData);
                
            } else {
                // 退款失败
                const errorMessage = result.error || '退款申请失败';
                const suggestion = result.suggestion || '';
                
                // 创建更友好的错误提示
                let alertMessage = `退款申请失败：${errorMessage}`;
                
                if (suggestion) {
                    alertMessage += `\n\n建议：${suggestion}`;
                } else {
                    alertMessage += `\n\n请联系客服：service@icstudio.club`;
                }
                
                alert(alertMessage);
                submitBtn.innerHTML = '重新提交';
                submitBtn.disabled = false;
                submitBtn.style.background = 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)';
                submitBtn.style.cursor = 'pointer';
            }
            
        } catch (error) {
            console.error('❌ Z-Pay退款申请失败:', error);
            console.log('🔍 DEBUG: Error type:', typeof error);
            console.log('🔍 DEBUG: Error stack:', error.stack);
            
            let errorMessage = `网络错误：${error.message}`;
            
            // 检查是否是JSON解析错误
            if (error.name === 'SyntaxError') {
                errorMessage = '服务器响应格式错误，请稍后重试';
            }
            
            alert(`${errorMessage}\n\n请稍后重试或联系客服：service@icstudio.club`);
            submitBtn.innerHTML = '重新提交';
            submitBtn.disabled = false;
            submitBtn.style.background = 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)';
            submitBtn.style.cursor = 'pointer';
        }
    }
    
    // 成功对话框
    function showRefundSuccessDialog(result) {
        const successModal = document.createElement('div');
        successModal.style.cssText = `
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
        `;
        
        successModal.innerHTML = `
            <div style="background: white; padding: 40px; border-radius: 16px; max-width: 450px; width: 90%; text-align: center; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);">
                ${result.auto_processed ? 
                    '<div style="font-size: 64px; margin-bottom: 20px;">🤖</div><h2 style="color: #27ae60; margin-bottom: 15px;">🤖 AI智能退款成功</h2>' :
                    '<div style="font-size: 64px; margin-bottom: 20px;">✅</div><h2 style="color: #27ae60; margin-bottom: 15px;">退款申请已提交</h2>'
                }
                
                <div style="background: ${result.auto_processed ? '#e8f4fd' : '#f0fff4'}; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left;">
                    <h4 style="color: ${result.auto_processed ? '#1976d2' : '#2f855a'}; margin: 0 0 10px 0;">
                        ${result.auto_processed ? '🤖 AI智能处理信息' : '处理信息'}
                    </h4>
                    
                    <p style="color: #2f855a; margin: 5px 0; font-size: 14px;">• 订单号：${result.out_trade_no || '已记录'}</p>
                    
                    ${result.request_id ? 
                        `<p style="color: #1976d2; margin: 5px 0; font-size: 14px;">• 🆔 处理单号：${result.request_id}</p>` : ''
                    }
                    
                    ${result.refund_amount ? 
                        `<p style="color: #2f855a; margin: 5px 0; font-size: 14px;">• 💰 退款金额：¥${result.refund_amount}</p>` : ''
                    }
                    
                    ${result.auto_processed ? 
                        '<p style="color: #1976d2; margin: 5px 0; font-size: 14px;">• 🚀 AI全自动处理：数据同步、状态更新、退款执行</p>' : ''
                    }
                    
                    ${result.zpay_status && result.zpay_status.code === 1 ? 
                        '<p style="color: #27ae60; margin: 5px 0; font-size: 14px;">• ✅ Z-Pay退款：已成功执行</p>' : ''
                    }
                    
                    ${result.refund_type === 'access_code' ? 
                        '<p style="color: #d69e2e; margin: 5px 0; font-size: 14px;">• ⚠️ 访问码已失效，无法再次使用</p>' : ''
                    }
                    
                    ${result.refund_type === 'manual_processing' ? 
                        '<p style="color: #f39c12; margin: 5px 0; font-size: 14px;">• 🛠️ 手动处理：数据同步问题，将手动退款</p>' : ''
                    }
                    
                    <p style="color: #2f855a; margin: 5px 0; font-size: 14px;">• ⏱️ 处理时间：${result.processing_time || '1-3个工作日'}</p>
                    <p style="color: #2f855a; margin: 5px 0; font-size: 14px;">• 💳 退款方式：原路返回</p>
                    
                    ${result.auto_processed ? 
                        '<p style="color: #1976d2; margin: 10px 0 5px 0; font-size: 13px; font-style: italic;">✨ 本次退款由IC Studio AI系统自动处理，确保快速准确</p>' : ''
                    }
                </div>
                <p style="color: #666; font-size: 14px; margin-bottom: 25px;">
                    我们已收到您的退款申请，将在1-3个工作日内处理完成。退款将原路返回到您的支付账户。
                    ${result.refund_type === 'access_code' ? 
                        '<br><strong>注意：</strong>该访问码已被删除，无法再次使用。' : ''
                    }
                </p>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: #27ae60; color: white; border: none; padding: 12px 30px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    确定
                </button>
            </div>
        `;
        
        document.body.appendChild(successModal);
    }
    
    // 访问码找回功能
    function showAccessCodeRecoveryDialog() {
        console.log('🔍 显示访问码找回对话框...');
        
        // 创建找回弹窗
        const recoveryModal = document.createElement('div');
        recoveryModal.style.cssText = `
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
        `;
        
        recoveryModal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 16px; max-width: 500px; width: 90%; position: relative; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);">
                <button onclick="this.parentElement.parentElement.remove()" style="
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    background: none;
                    border: none;
                    font-size: 24px;
                    color: #999;
                    cursor: pointer;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: background 0.2s;
                " onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='none'">×</button>
                
                <h2 style="color: #333; margin-bottom: 20px; text-align: center;">🔍 找回访问码</h2>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: #666; margin-bottom: 8px; font-weight: 600;">支付宝账号：</label>
                    <input type="text" id="recovery-alipay-account" placeholder="请输入支付时使用的支付宝账号（手机号或邮箱）" 
                           style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
                    <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">请输入您购买时使用的支付宝账号</p>
                </div>
                
                <div id="recovery-result" style="margin-bottom: 20px; display: none;"></div>
                
                <div style="text-align: center; margin-bottom: 15px;">
                    <button id="recover-btn" onclick="window.recoverAccessCodes()" 
                            style="background: #27ae60; color: white; border: none; padding: 12px 30px; border-radius: 8px; cursor: pointer; font-weight: 600; margin-right: 10px;">
                        🔍 找回访问码
                    </button>
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="background: #95a5a6; color: white; border: none; padding: 12px 30px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        取消
                    </button>
                </div>
                
                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px;">
                    <h4 style="color: #1976d2; margin: 0 0 10px 0; font-size: 14px;">💬 找不到访问码？</h4>
                    <p style="color: #1565c0; font-size: 14px; margin: 0; line-height: 1.6;">
                        如果您在支付时未保存支付宝账号信息，或找不到访问码，请联系客服：
                        <br><strong>service@icstudio.club</strong>
                        <br>我们将协助您处理退款申请。
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(recoveryModal);
        console.log('✅ 访问码找回对话框已显示');
    }
    
    // 找回访问码功能
    async function recoverAccessCodes() {
        const alipayAccountInput = document.getElementById('recovery-alipay-account');
        const recoverBtn = document.getElementById('recover-btn');
        const resultDiv = document.getElementById('recovery-result');
        
        const alipayAccount = alipayAccountInput.value.trim();
        
        if (!alipayAccount) {
            alert('请输入支付宝账号');
            alipayAccountInput.focus();
            return;
        }
        
        // 验证支付宝账号格式
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const phonePattern = /^1[3-9]\d{9}$/;
        
        if (!emailPattern.test(alipayAccount) && !phonePattern.test(alipayAccount)) {
            alert('请输入有效的邮箱地址或手机号');
            alipayAccountInput.focus();
            return;
        }
        
        const originalText = recoverBtn.innerHTML;
        recoverBtn.innerHTML = '🔍 查找中...';
        recoverBtn.disabled = true;
        
        try {
            // 调用云函数找回访问码
            const response = await fetch('https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/recoverAccessCode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Request-Source': 'IC-Studio-Recovery'
                },
                body: JSON.stringify({
                    alipay_account: alipayAccount,
                    timestamp: new Date().toISOString()
                })
            });
            
            const result = await response.json();
            
            if (result.success && result.data && result.data.access_codes && result.data.access_codes.length > 0) {
                // 显示找到的访问码
                const codes = result.data.access_codes;
                resultDiv.innerHTML = `
                    <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border: 2px solid #27ae60;">
                        <h4 style="color: #27ae60; margin: 0 0 15px 0;">✅ 找到 ${codes.length} 个访问码：</h4>
                        ${codes.map(codeInfo => `
                            <div style="background: white; padding: 10px; margin: 8px 0; border-radius: 6px; border: 1px solid #27ae60;">
                                <div style="font-family: monospace; font-size: 16px; font-weight: bold; color: #2c3e50; margin-bottom: 5px;">
                                    ${codeInfo.access_code}
                                    <button onclick="navigator.clipboard.writeText('${codeInfo.access_code}').then(() => {this.innerHTML='✅ 已复制'; setTimeout(() => this.innerHTML='📋 复制', 2000);})" 
                                            style="margin-left: 10px; background: #667eea; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                                        📋 复制
                                    </button>
                                </div>
                                ${codeInfo.order_no ? `<div style="font-size: 12px; color: #666;">订单号: ${codeInfo.order_no}</div>` : ''}
                                ${codeInfo.collected_at ? `<div style="font-size: 12px; color: #666;">保存时间: ${new Date(codeInfo.collected_at).toLocaleString()}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                `;
                resultDiv.style.display = 'block';
                
                console.log('✅ 成功找回访问码:', codes.length, '个');
            } else {
                // 显示未找到的信息
                resultDiv.innerHTML = `
                    <div style="background: #fff3e0; padding: 15px; border-radius: 8px; border: 2px solid #f57c00;">
                        <h4 style="color: #f57c00; margin: 0 0 10px 0;">⚠️ 未找到访问码</h4>
                        <p style="color: #e65100; font-size: 14px; margin: 0; line-height: 1.6;">
                            ${result.error || '没有找到与此支付宝账号关联的访问码记录。'}
                        </p>
                        ${result.suggestion && result.suggestion.options ? `
                            <div style="margin-top: 10px;">
                                <strong style="color: #e65100; font-size: 14px;">建议：</strong>
                                <ul style="color: #e65100; font-size: 13px; margin: 5px 0 0 0; padding-left: 20px;">
                                    ${result.suggestion.options.map(option => `<li>${option}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                `;
                resultDiv.style.display = 'block';
            }
        } catch (error) {
            console.error('❌ 找回访问码失败:', error);
            resultDiv.innerHTML = `
                <div style="background: #ffebee; padding: 15px; border-radius: 8px; border: 2px solid #f44336;">
                    <h4 style="color: #f44336; margin: 0 0 10px 0;">❌ 系统错误</h4>
                    <p style="color: #c62828; font-size: 14px; margin: 0;">
                        查找过程中发生错误，请稍后重试或联系客服：service@icstudio.club
                    </p>
                </div>
            `;
            resultDiv.style.display = 'block';
        } finally {
            recoverBtn.innerHTML = originalText;
            recoverBtn.disabled = false;
        }
    }
    
    // 保持兼容性的别名函数
    function showAccessCodeHelpDialog() {
        showAccessCodeRecoveryDialog();
    }

    // 暴露函数到全局作用域
    window.showRefundDialog = showRefundDialog;
    window.validateRefundForm = validateRefundForm;
    window.submitRefund = submitRefund;
    window.showRefundSuccessDialog = showRefundSuccessDialog;
    
    window.showAccessCodeHelpDialog = showAccessCodeHelpDialog;
    window.showAccessCodeRecoveryDialog = showAccessCodeRecoveryDialog;
    window.recoverAccessCodes = recoverAccessCodes;
    
    console.log('✅ 退款处理器初始化完成');
    console.log('💡 可用函数: window.showRefundDialog()');
    
    // 等待页面加载完成后绑定按钮事件
    function bindButtons() {
        // 绑定退款按钮
        const refundBtn = document.getElementById('refund-btn');
        if (refundBtn) {
            refundBtn.onclick = function() {
                console.log('🔄 退款按钮被点击');
                showRefundDialog();
            };
            console.log('✅ 退款按钮事件已绑定');
        }
        
        // 绑定找回访问码按钮
        const recoverBtn = document.getElementById('recover-access-code-btn');
        if (recoverBtn) {
            recoverBtn.onclick = function() {
                console.log('🔍 找回访问码按钮被点击');
                showAccessCodeHelpDialog();
            };
            console.log('✅ 找回访问码按钮事件已绑定');
        }
        
        // 如果有按钮未找到，重试
        if (!refundBtn || !recoverBtn) {
            console.log('⚠️ 部分按钮暂未找到，1秒后重试...');
            setTimeout(bindButtons, 1000);
        }
    }
    
    // 开始绑定按钮
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindButtons);
    } else {
        bindButtons();
    }
    
})();