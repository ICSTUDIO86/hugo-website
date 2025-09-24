/**
 * IC Studio - 退款时间检查工具
 * 通用的7天期限检查逻辑
 */

/**
 * 检查订单是否在7天退款期限内
 * @param {Object} orderRecord - 订单记录
 * @param {Object} codeRecord - 访问码记录（可选）
 * @returns {Object} 检查结果
 */
function checkRefundTimeLimit(orderRecord, codeRecord = null) {
    try {
        // 1. 获取购买时间 - 支持多种时间字段格式
        let purchaseTime = null;

        if (orderRecord) {
            // 优先使用 paid_at（Gumroad）
            purchaseTime = orderRecord.paid_at ||
                          orderRecord.pay_time ||     // 支付宝
                          orderRecord.payment_time || // 其他支付
                          orderRecord.created_at ||   // 创建时间
                          orderRecord.created_time;   // 创建时间（旧格式）
        }

        // 如果订单中没有时间，尝试从访问码记录获取
        if (!purchaseTime && codeRecord) {
            purchaseTime = codeRecord.created_at ||
                          codeRecord.payment_time ||
                          codeRecord.created_time;
        }

        if (!purchaseTime) {
            return {
                valid: false,
                error: 'unable_to_determine_purchase_time',
                message: '无法确定购买时间，请联系客服处理',
                days_passed: null
            };
        }

        // 2. 计算时间差
        const now = new Date();
        const purchase = new Date(purchaseTime);
        const timeDiff = now.getTime() - purchase.getTime();
        const daysPassed = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        // 3. 检查是否超过7天（严格执行：只允许第0-6天，总共7天）
        const within7Days = daysPassed < 7;

        return {
            valid: within7Days,
            error: within7Days ? null : 'refund_time_expired',
            message: within7Days ?
                '在退款期限内' :
                `购买已超过7天（${daysPassed}天），根据退款政策无法申请退款`,
            days_passed: daysPassed,
            purchase_time: purchase,
            purchase_time_str: purchase.toLocaleString('zh-CN', {
                timeZone: 'Asia/Shanghai',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
        };

    } catch (error) {
        console.error('⚠️ 退款时间检查出错:', error);
        return {
            valid: false,
            error: 'time_check_failed',
            message: '时间检查失败，请联系客服处理',
            days_passed: null
        };
    }
}

/**
 * 格式化退款时间限制错误信息
 * @param {Object} timeCheck - 时间检查结果
 * @param {string} orderNo - 订单号
 * @returns {Object} 格式化的错误信息
 */
function formatRefundTimeError(timeCheck, orderNo = '') {
    const orderText = orderNo ? `订单 ${orderNo} ` : '';

    switch (timeCheck.error) {
        case 'refund_time_expired':
            return {
                success: false,
                error: 'REFUND_TIME_EXPIRED',
                message: `${orderText}已超过7天退款期限`,
                details: {
                    purchase_time: timeCheck.purchase_time_str,
                    days_passed: timeCheck.days_passed,
                    policy: '根据退款政策，仅支持购买后7天内的退款申请',
                    contact: '如有特殊情况，请联系客服：service@icstudio.club'
                }
            };

        case 'unable_to_determine_purchase_time':
            return {
                success: false,
                error: 'PURCHASE_TIME_UNKNOWN',
                message: `${orderText}购买时间信息缺失`,
                details: {
                    reason: '无法确定购买时间',
                    action: '请联系客服手动处理',
                    contact: 'service@icstudio.club'
                }
            };

        case 'time_check_failed':
            return {
                success: false,
                error: 'TIME_CHECK_ERROR',
                message: '退款时间检查失败',
                details: {
                    reason: '系统时间计算异常',
                    action: '请稍后重试或联系客服',
                    contact: 'service@icstudio.club'
                }
            };

        default:
            return {
                success: false,
                error: 'UNKNOWN_ERROR',
                message: '未知错误，请联系客服',
                details: {
                    contact: 'service@icstudio.club'
                }
            };
    }
}

module.exports = {
    checkRefundTimeLimit,
    formatRefundTimeError
};