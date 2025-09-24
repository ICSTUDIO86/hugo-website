/**
 * IC Studio - Gumroad Webhook 处理器
 * 处理Gumroad的销售和退款事件，完全兼容现有系统
 */

const cloud = require('@cloudbase/node-sdk');
const nodemailer = require('nodemailer');
const { checkRefundTimeLimit, formatRefundTimeError } = require('../utils/refundTimeChecker');

exports.main = async (event, context) => {
    console.log('🚀 Gumroad Webhook 处理器启动');
    console.log('📨 接收参数:', JSON.stringify(event, null, 2));

    // 添加CORS头部支持
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Gumroad-Signature',
        'Content-Type': 'application/json'
    };

    // 处理预检请求
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    try {
        const app = cloud.init({
            env: cloud.SYMBOL_CURRENT_ENV
        });
        const db = app.database();

        // 解析Webhook数据 - 兼容HTTP调用和SDK调用
        let webhookData = {};

        if (event.body) {
            // HTTP调用 - 数据在body中
            try {
                webhookData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
            } catch (e) {
                console.error('❌ 解析Webhook数据失败:', e);
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Invalid JSON payload' })
                };
            }
        } else {
            // SDK直接调用 - 数据直接在event中
            webhookData = event;
        }

        // 获取事件类型
        const eventType = webhookData.type || 'sale'; // 默认为销售事件
        console.log('📋 事件类型:', eventType);

        // 路由到相应的处理函数
        let result;
        switch(eventType) {
            case 'sale':
                result = await handleGumroadSale(webhookData, db);
                break;
            case 'refund':
                result = await handleGumroadRefund(webhookData, db);
                break;
            case 'dispute':
                result = await handleGumroadDispute(webhookData, db);
                break;
            default:
                console.log('⚠️ 未处理的事件类型:', eventType);
                result = { success: true, message: 'Event type not processed' };
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('❌ Webhook处理失败:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: 'Webhook processing failed',
                message: error.message
            })
        };
    }
};

/**
 * 处理Gumroad销售事件
 */
async function handleGumroadSale(saleData, db) {
    console.log('🛒 处理Gumroad销售事件');

    const {
        order_id,
        buyer_email,
        product_name,
        price,
        currency,
        timestamp,
        product_id
    } = saleData;

    console.log('🔍 验证订单信息:', { order_id, buyer_email });

    if (!order_id || !buyer_email) {
        throw new Error(`缺少必要的订单信息: order_id=${order_id}, buyer_email=${buyer_email}`);
    }

    // 检查是否已经处理过这个订单
    const existingOrder = await db.collection('orders').where({
        out_trade_no: `GR${order_id}`
    }).get();

    if (existingOrder.data.length > 0) {
        console.log('⚠️ 订单已存在，跳过处理');
        return {
            success: false,
            message: '订单已存在',
            order_id: order_id
        };
    }

    // 生成访问码
    const accessCode = generateAccessCode();
    console.log('🎫 生成访问码:', accessCode);

    const orderNo = `GR${order_id}`;
    const amount = parseFloat(price || 48.00).toFixed(2);
    const productName = product_name || 'IC Studio 视奏工具';

    // 1. 写入codes集合 (完全兼容现有结构)
    await db.collection('codes').add({
        access_code: accessCode,
        order_no: orderNo,
        amount: amount,
        status: 'paid',
        product_name: productName,
        source: 'gumroad',
        gumroad_order_id: order_id,
        gumroad_product_id: product_id,
        buyer_email: buyer_email,
        currency: currency || 'USD',
        created_at: new Date(),
        updated_time: new Date()
    });

    console.log('✅ codes集合记录已创建');

    // 2. 写入orders集合 (完全兼容现有结构)
    await db.collection('orders').add({
        out_trade_no: orderNo,
        gumroad_order_id: order_id,
        access_code: accessCode,
        status: 'paid',
        money: amount,
        name: productName,
        buyer_email: buyer_email,
        source: 'gumroad',
        currency: currency || 'USD',
        paid_at: timestamp ? new Date(timestamp) : new Date(),
        created_at: new Date(),
        updated_time: new Date()
    });

    console.log('✅ orders集合记录已创建');

    // 3. 通过 Fastmail 发送访问码邮件
    console.log('🎯 访问码已生成:', accessCode);

    try {
        await sendAccessCodeEmail(buyer_email, accessCode, {
            order_id: orderNo,
            product_name: productName,
            amount: amount,
            currency: currency || 'USD'
        });
        console.log('📧 访问码邮件已通过 Fastmail 发送成功');
    } catch (emailError) {
        console.error('⚠️ Fastmail 邮件发送失败:', emailError);
        console.log('📧 用户仍可通过查找功能获取访问码');
        // 邮件失败不影响主流程，访问码已正常生成
    }

    return {
        success: true,
        message: 'Gumroad订单处理成功',
        data: {
            access_code: accessCode,
            order_id: orderNo,
            gumroad_order_id: order_id,
            buyer_email: buyer_email,
            amount: amount,
            currency: currency || 'USD'
        }
    };
}

/**
 * 处理Gumroad退款事件
 */
async function handleGumroadRefund(refundData, db) {
    console.log('💰 处理Gumroad退款事件');

    const {
        order_id,
        refunded_amount,
        buyer_email,
        timestamp
    } = refundData;

    if (!order_id) {
        throw new Error('缺少订单ID');
    }

    const orderNo = `GR${order_id}`;

    // 查找对应的订单
    const orderQuery = await db.collection('orders').where({
        out_trade_no: orderNo
    }).get();

    if (orderQuery.data.length === 0) {
        console.log('⚠️ 未找到对应的订单');
        return {
            success: false,
            message: '订单未找到',
            order_id: order_id
        };
    }

    const order = orderQuery.data[0];
    const accessCode = order.access_code;

    // 检查是否已经退款
    if (order.refund_status === 'refunded') {
        console.log('⚠️ 订单已经退款');
        return {
            success: false,
            message: '订单已经退款',
            access_code: accessCode
        };
    }

    // 🕐 检查退款时间期限（7天内）
    console.log('🕐 检查退款时间期限...');
    const timeCheck = checkRefundTimeLimit(order);

    if (!timeCheck.valid) {
        console.log('❌ 超过退款期限:', timeCheck.message);

        // 记录超期退款尝试日志
        try {
            await db.collection('refund_logs').add({
                data: {
                    access_code: accessCode,
                    order_no: orderNo,
                    gumroad_order_id: order_id,
                    status: 'rejected_time_expired',
                    rejection_reason: timeCheck.message,
                    days_passed: timeCheck.days_passed,
                    purchase_time: timeCheck.purchase_time,
                    attempt_time: new Date(),
                    source: 'gumroad_webhook',
                    request_id: `gumroad_expired_${order_id}_${Date.now()}`
                }
            });
        } catch (logError) {
            console.warn('⚠️ 超期退款日志记录失败:', logError);
        }

        // 返回时间期限错误
        const timeError = formatRefundTimeError(timeCheck, orderNo);
        return {
            success: false,
            error: timeError.error,
            message: timeError.message,
            details: timeError.details,
            order_id: order_id,
            access_code: accessCode
        };
    }

    console.log('✅ 退款时间检查通过:', `购买${timeCheck.days_passed}天后申请退款`);

    const refundOrderNo = `GRF${Date.now()}`;
    const refundAmount = parseFloat(refunded_amount || order.money).toFixed(2);

    console.log('🔄 开始失效访问码:', accessCode);

    // 1. 更新codes集合状态为refunded (完全兼容现有结构)
    await db.collection('codes')
        .where({ access_code: accessCode })
        .update({
            status: 'refunded',
            refund_time: timestamp ? new Date(timestamp) : new Date(),
            refund_amount: refundAmount,
            refund_order_no: refundOrderNo,
            refund_source: 'gumroad_webhook',
            updated_time: new Date()
        });

    console.log('✅ codes集合已更新为退款状态');

    // 2. 更新orders集合退款信息 (完全兼容现有结构)
    await db.collection('orders')
        .where({ out_trade_no: orderNo })
        .update({
            refund_status: 'refunded',
            refund_time: timestamp ? new Date(timestamp) : new Date(),
            refund_amount: refundAmount,
            refund_order_no: refundOrderNo,
            access_code_refunded: accessCode,
            refund_source: 'gumroad_webhook',
            updated_time: new Date()
        });

    console.log('✅ orders集合已更新为退款状态');

    // 3. 记录退款日志 (兼容现有日志格式)
    try {
        await db.collection('refund_logs').add({
            access_code: accessCode,
            order_no: orderNo,
            refund_order_no: refundOrderNo,
            amount: refundAmount,
            gumroad_order_id: order_id,
            gumroad_response: refundData,
            status: 'gumroad_webhook_refund',
            request_time: new Date(),
            source: 'gumroad',
            request_id: `gumroad_${order_id}_${Date.now()}`
        });
        console.log('✅ 退款日志已记录');
    } catch (logError) {
        console.warn('⚠️ 退款日志记录失败:', logError);
    }

    // 4. 发送退款通知邮件
    if (buyer_email) {
        try {
            await sendRefundNotificationEmail(buyer_email, accessCode, {
                order_id: orderNo,
                gumroad_order_id: order_id,
                refund_amount: refundAmount,
                refund_time: timestamp ? new Date(timestamp) : new Date()
            });
            console.log('📧 退款通知邮件已发送');
        } catch (emailError) {
            console.error('⚠️ 退款通知邮件发送失败:', emailError);
        }
    }

    return {
        success: true,
        message: 'Gumroad退款处理成功，访问码已失效',
        data: {
            access_code: accessCode,
            order_id: orderNo,
            gumroad_order_id: order_id,
            refund_amount: refundAmount,
            refund_order_no: refundOrderNo,
            refund_time: new Date()
        }
    };
}

/**
 * 处理Gumroad争议事件
 */
async function handleGumroadDispute(disputeData, db) {
    console.log('⚖️ 处理Gumroad争议事件');

    // 争议事件按照退款逻辑处理
    return await handleGumroadRefund(disputeData, db);
}

/**
 * 生成访问码 - 兼容现有格式
 */
function generateAccessCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const length = Math.random() < 0.5 ? 11 : 12; // 随机11位或12位
    let code = '';

    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
}

/**
 * 发送访问码邮件
 */
async function sendAccessCodeEmail(email, accessCode, orderInfo) {
    console.log('📧 准备发送访问码邮件到:', email);

    const emailContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>IC Studio 访问码</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #4CAF50;">🎉 感谢购买 IC Studio 视奏工具！</h2>
        </div>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #4CAF50;">
            <h3 style="color: #333; margin-bottom: 15px;">📋 您的访问信息</h3>

            <div style="background: #fff; padding: 15px; border-radius: 8px; margin: 10px 0;">
                <p style="margin: 5px 0;"><strong>访问码：</strong>
                    <span style="font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold; color: #007bff; background: #f1f5f9; padding: 4px 8px; border-radius: 4px;">${accessCode}</span>
                </p>
                <p style="margin: 5px 0;"><strong>订单号：</strong> ${orderInfo.order_id}</p>
                <p style="margin: 5px 0;"><strong>产品：</strong> ${orderInfo.product_name}</p>
                <p style="margin: 5px 0;"><strong>金额：</strong> ${orderInfo.currency} ${orderInfo.amount}</p>
                <p style="margin: 5px 0;"><strong>购买时间：</strong> ${new Date().toLocaleString()}</p>
            </div>
        </div>

        <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2e7d32; margin-bottom: 15px;">开始使用</h3>
            <p style="color: #2e7d32; margin: 5px 0;">1. 访问工具页面：<a href="https://icstudio.club/tools/sight-reading-generator.html" style="color: #007bff;">点击这里</a></p>
            <p style="color: #2e7d32; margin: 5px 0;">2. 输入上方的访问码</p>
            <p style="color: #2e7d32; margin: 5px 0;">3. 点击验证，即可享受完整版功能</p>
        </div>

        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #856404;">📦 桌面版下载</h3>
            <p style="color: #856404; margin: 5px 0;">完整的桌面应用程序即将推出，敬请期待！</p>
            <p style="color: #856404; margin: 5px 0;">届时您可以使用相同的访问码激活桌面版。</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="https://icstudio.club/tools/sight-reading-generator.html"
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                🎵 立即开始练习视奏
            </a>
        </div>

        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px; text-align: center;">
            <p>如有任何问题，请联系：<a href="mailto:service@icstudio.club" style="color: #007bff;">service@icstudio.club</a></p>
            <p>感谢您对 IC Studio 的支持！</p>
        </div>
    </body>
    </html>
    `;

    // 这里使用腾讯云邮件服务或其他邮件服务
    // 开源邮件发送配置 (支持多种服务)
    const SMTP_HOST = process.env.SMTP_HOST;
    const SMTP_PORT = process.env.SMTP_PORT || 587;
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;
    const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@icstudio.club';

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        console.log('⚠️ SMTP 配置未完成，仅记录日志');
        console.log('📧 邮件内容已准备，等待邮件服务配置');
        console.log(`收件人: ${email}`);
        console.log(`访问码: ${accessCode}`);
        console.log('💡 支持的邮件服务: 腾讯云SES、阿里云、Gmail、自建SMTP等');
        return true;
    }

    try {
        // 创建 nodemailer 传输器 (支持各种 SMTP，包括 Fastmail)
        const transporter = nodemailer.createTransporter({
            host: SMTP_HOST,
            port: parseInt(SMTP_PORT),
            secure: SMTP_PORT == 465, // true for 465, false for other ports
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS
            },
            // Fastmail 特定优化
            tls: {
                rejectUnauthorized: false // 兼容各种 SSL 配置
            },
            connectionTimeout: 10000, // 10秒连接超时
            greetingTimeout: 5000,    // 5秒问候超时
            socketTimeout: 10000      // 10秒套接字超时
        });

        // 发送邮件
        const mailOptions = {
            from: FROM_EMAIL,
            to: email,
            subject: '🎉 您的 IC Studio 视奏工具访问码',
            html: emailContent
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ 访问码邮件发送成功:', email);
        return true;

    } catch (error) {
        console.error('❌ SMTP 邮件发送失败:', error);

        // 邮件发送失败时记录日志
        console.log('📧 邮件发送失败，记录邮件内容');
        console.log(`收件人: ${email}`);
        console.log(`访问码: ${accessCode}`);

        throw error;
    }
}

/**
 * 发送退款通知邮件
 */
async function sendRefundNotificationEmail(email, accessCode, refundInfo) {
    console.log('📧 准备发送退款通知邮件到:', email);

    const emailContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>IC Studio 退款通知</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #ff6b6b;">💰 退款处理通知</h2>
        </div>

        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #856404;">📋 退款信息</h3>
            <p style="color: #856404; margin: 5px 0;"><strong>订单号：</strong> ${refundInfo.order_id}</p>
            <p style="color: #856404; margin: 5px 0;"><strong>Gumroad订单：</strong> ${refundInfo.gumroad_order_id}</p>
            <p style="color: #856404; margin: 5px 0;"><strong>退款金额：</strong> $${refundInfo.refund_amount}</p>
            <p style="color: #856404; margin: 5px 0;"><strong>退款时间：</strong> ${refundInfo.refund_time.toLocaleString()}</p>
            <p style="color: #856404; margin: 5px 0;"><strong>访问码：</strong>
                <span style="font-family: monospace; background: #e9ecef; padding: 4px 8px; border-radius: 4px; text-decoration: line-through;">${accessCode}</span>
                <span style="color: #dc3545;">(已失效)</span>
            </p>
        </div>

        <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #721c24; margin: 0;">
                <strong>⚠️ 重要提醒：</strong><br>
                由于您的订单已通过Gumroad退款，对应的访问码已自动失效，无法再使用IC Studio视奏工具的完整功能。
            </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <p>如需继续使用，请重新购买：</p>
            <a href="https://gumroad.com/l/ic-studio-sight-reading"
               style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                🛒 重新购买
            </a>
        </div>

        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px; text-align: center;">
            <p>如有疑问，请联系：<a href="mailto:service@icstudio.club" style="color: #007bff;">service@icstudio.club</a></p>
        </div>
    </body>
    </html>
    `;

    // SendGrid 邮件发送配置
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@icstudio.club';

    if (!SENDGRID_API_KEY) {
        console.log('⚠️ SendGrid API Key 未配置，仅记录日志');
        console.log('📧 退款通知邮件内容已准备');
        console.log(`收件人: ${email}`);
        console.log(`失效的访问码: ${accessCode}`);
        return true;
    }

    try {
        // 配置 SendGrid
        sgMail.setApiKey(SENDGRID_API_KEY);

        // 发送邮件
        const msg = {
            to: email,
            from: FROM_EMAIL,
            subject: '⚠️ IC Studio 订单退款通知',
            html: emailContent
        };

        await sgMail.send(msg);
        console.log('✅ 退款通知邮件发送成功:', email);
        return true;

    } catch (error) {
        console.error('❌ SendGrid 退款邮件发送失败:', error);

        // 邮件发送失败时记录日志
        console.log('📧 退款邮件发送失败，记录邮件内容');
        console.log(`收件人: ${email}`);
        console.log(`失效的访问码: ${accessCode}`);

        throw error;
    }
}