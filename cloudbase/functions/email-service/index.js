/**
 * 统一邮件服务系统
 * 支持：支付成功邮件、忘记访问码邮件、退款通知邮件等
 * 
 * API 端点：
 * - /api/email/send-license - 发送许可证激活邮件
 * - /api/email/forgot-license - 发送忘记访问码邮件
 * - /api/email/refund-notification - 发送退款通知邮件
 */

const cloud = require('@cloudbase/node-sdk')
const nodemailer = require('nodemailer')

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
})

const db = app.database()
const emailLogsCollection = db.collection('email_logs')
const licensesCollection = db.collection('licenses')

// 邮件配置 - 使用环境变量
const emailConfig = {
  service: process.env.EMAIL_SERVICE || 'gmail', // 'gmail', 'outlook', 'smtp'
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || 'noreply@icstudio.club',
    pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD
  }
}

// 创建邮件传输器
const transporter = nodemailer.createTransporter(emailConfig)

// 生成邮件ID
function generateEmailId() {
  return `EMAIL-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`
}

// 记录邮件日志
async function logEmail(emailData, status, error = null) {
  try {
    await emailLogsCollection.add({
      emailId: emailData.emailId,
      recipientEmail: emailData.recipientEmail,
      recipientName: emailData.recipientName,
      subject: emailData.subject,
      template: emailData.template,
      templateData: emailData.templateData,
      status: status, // PENDING | SENT | FAILED | BOUNCED
      error: error,
      licenseId: emailData.licenseId || null,
      orderId: emailData.orderId || null,
      sentAt: status === 'SENT' ? new Date() : null,
      createdAt: new Date()
    })
  } catch (logError) {
    console.error('❌ 邮件日志记录失败:', logError.message)
  }
}

// 邮件模板系统
const emailTemplates = {
  
  // 许可证激活邮件模板
  'license-activated': (data) => {
    const downloadBaseUrl = 'https://cloud1-4g1r5ho01a0cfd85.ap-shanghai.app.tcloudbase.com/downloads'
    
    return {
      subject: `🎉 IC Studio 视奏工具 - 您的许可证已激活`,
      html: `
        <div style="font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">IC Studio</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 16px;">专业级视奏旋律生成器</p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #2c3e50; margin-bottom: 20px;">🎉 支付成功！您的许可证已激活</h2>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">
              亲爱的 <strong>${data.customerName || '用户'}</strong>，感谢您购买 IC Studio 视奏工具！您的许可证已成功激活，现在可以开始享受专业级的音乐学习体验。
            </p>
            
            <!-- License Key Box -->
            <div style="background: #f8f9fa; border: 2px solid #667eea; border-radius: 12px; padding: 25px; margin: 30px 0; text-align: center;">
              <h3 style="color: #667eea; margin-bottom: 15px; font-size: 18px;">🔑 您的许可证密钥</h3>
              <div style="background: white; padding: 20px; border-radius: 8px; border: 2px dashed #667eea;">
                <code style="font-size: 24px; font-weight: bold; color: #2c3e50; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                  ${data.licenseKey}
                </code>
              </div>
              <p style="color: #666; font-size: 14px; margin-top: 15px;">
                💡 请妥善保存此许可证密钥，它可同时用于网页版和桌面版软件
              </p>
            </div>
            
            <!-- Download Section -->
            <div style="background: #fff5f5; border-radius: 12px; padding: 25px; margin: 30px 0;">
              <h3 style="color: #e74c3c; margin-bottom: 20px; text-align: center;">📥 下载桌面版软件</h3>
              
              <!-- macOS Downloads -->
              <div style="margin-bottom: 20px;">
                <h4 style="color: #333; margin-bottom: 10px; text-align: center;">🍎 macOS 版本</h4>
                <div style="display: flex; justify-content: center; flex-wrap: wrap; gap: 10px;">
                  <a href="${downloadBaseUrl}/IC Studio 视奏工具-1.0.0-mac-arm64.zip" style="background: #007aff; color: white; padding: 12px 18px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 14px; text-align: center;">
                    M1/M2/M3 (ZIP)
                  </a>
                  <a href="${downloadBaseUrl}/IC Studio 视奏工具-1.0.0-mac-x64.dmg" style="background: #007aff; color: white; padding: 12px 18px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 14px; text-align: center;">
                    Intel (DMG)
                  </a>
                  <a href="${downloadBaseUrl}/IC Studio 视奏工具-1.0.0-mac-x64.zip" style="background: #007aff; color: white; padding: 12px 18px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 14px; text-align: center;">
                    Intel (ZIP)
                  </a>
                </div>
              </div>
              
              <!-- Windows Downloads -->
              <div style="margin-bottom: 20px;">
                <h4 style="color: #333; margin-bottom: 10px; text-align: center;">🪟 Windows 版本</h4>
                <div style="display: flex; justify-content: center; flex-wrap: wrap; gap: 10px;">
                  <a href="${downloadBaseUrl}/IC Studio 视奏工具-1.0.0-win-x64.exe" style="background: #0078d4; color: white; padding: 12px 18px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 14px; text-align: center;">
                    64位版本
                  </a>
                  <a href="${downloadBaseUrl}/IC Studio 视奏工具-1.0.0-win.exe" style="background: #0078d4; color: white; padding: 12px 18px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 14px; text-align: center;">
                    通用版本
                  </a>
                </div>
              </div>
              
              <!-- Linux Downloads -->
              <div style="margin-bottom: 10px;">
                <h4 style="color: #333; margin-bottom: 10px; text-align: center;">🐧 Linux 版本</h4>
                <div style="display: flex; justify-content: center; flex-wrap: wrap; gap: 10px;">
                  <a href="${downloadBaseUrl}/IC Studio 视奏工具-1.0.0-linux-x86_64.AppImage" style="background: #f39c12; color: white; padding: 12px 18px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 14px; text-align: center;">
                    AppImage (通用)
                  </a>
                  <a href="${downloadBaseUrl}/IC Studio 视奏工具-1.0.0-linux-amd64.deb" style="background: #f39c12; color: white; padding: 12px 18px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 14px; text-align: center;">
                    DEB 包 (Ubuntu/Debian)
                  </a>
                </div>
              </div>
            </div>
            
            <!-- Web Access -->
            <div style="background: #f0fff4; border-radius: 12px; padding: 25px; margin: 30px 0; text-align: center;">
              <h3 style="color: #27ae60; margin-bottom: 15px;">🌐 网页版访问</h3>
              <p style="color: #666; margin-bottom: 20px;">您也可以直接在浏览器中使用工具，无需下载软件：</p>
              <a href="https://icstudio.club/tools/sight-reading-generator.html" style="background: #27ae60; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                🚀 立即使用网页版
              </a>
            </div>
            
            <!-- Features List -->
            <div style="margin: 30px 0;">
              <h3 style="color: #2c3e50; margin-bottom: 20px;">✨ 您获得的功能</h3>
              <ul style="color: #555; line-height: 1.8; padding-left: 20px;">
                <li>🎵 无限制生成视奏旋律</li>
                <li>🎹 24个大小调支持（自然小调、和声小调、旋律小调）</li>
                <li>🎼 专业级乐谱渲染（基于OpenSheetMusicDisplay引擎）</li>
                <li>🎯 完全自定义音域、节奏、音程跨度设置</li>
                <li>🎸 丰富的演奏技巧支持（重音、断奏、倚音等）</li>
                <li>⏱️ 内置节拍器功能</li>
                <li>📱 同时支持网页版和桌面版（${data.maxDevices === -1 ? '无限设备' : `最多 ${data.maxDevices || 3} 台设备`}）</li>
                <li>🔄 永久使用权限，包含所有未来更新</li>
              </ul>
            </div>
            
            <!-- Support Info -->
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <h4 style="color: #2c3e50; margin-bottom: 10px;">💬 需要帮助？</h4>
              <p style="color: #666; margin-bottom: 10px;">如有任何问题或需要技术支持，请联系我们：</p>
              <p style="color: #666; margin: 0;">
                📧 <a href="mailto:support@icstudio.club" style="color: #667eea;">support@icstudio.club</a><br>
                🌐 <a href="https://icstudio.club" style="color: #667eea;">icstudio.club</a>
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #2c3e50; color: #bdc3c7; padding: 20px 30px; text-align: center; font-size: 14px;">
            <p style="margin: 0 0 10px 0;">IC Studio - 让音乐学习更简单</p>
            <p style="margin: 0; opacity: 0.8;">此邮件是自动发送的，请勿直接回复</p>
          </div>
        </div>
      `,
      text: `
IC Studio 视奏工具 - 许可证激活成功

亲爱的 ${data.customerName || '用户'}，

感谢您购买 IC Studio 视奏工具！您的许可证已成功激活。

您的许可证密钥：${data.licenseKey}

下载链接：
- macOS M1/M2/M3: ${downloadBaseUrl}/IC Studio 视奏工具-1.0.0-mac-arm64.zip
- macOS Intel (DMG): ${downloadBaseUrl}/IC Studio 视奏工具-1.0.0-mac-x64.dmg
- macOS Intel (ZIP): ${downloadBaseUrl}/IC Studio 视奏工具-1.0.0-mac-x64.zip
- Windows (64位): ${downloadBaseUrl}/IC Studio 视奏工具-1.0.0-win-x64.exe
- Windows (通用): ${downloadBaseUrl}/IC Studio 视奏工具-1.0.0-win.exe
- Linux (AppImage): ${downloadBaseUrl}/IC Studio 视奏工具-1.0.0-linux-x86_64.AppImage
- Linux (DEB包): ${downloadBaseUrl}/IC Studio 视奏工具-1.0.0-linux-amd64.deb

网页版访问：https://icstudio.club/tools/sight-reading-generator.html

如需帮助，请联系：support@icstudio.club

IC Studio 团队
      `
    }
  },
  
  // 忘记访问码邮件模板
  'forgot-license': (data) => {
    return {
      subject: `🔑 IC Studio 视奏工具 - 您的许可证信息`,
      html: `
        <div style="font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">IC Studio</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 16px;">许可证信息找回</p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #2c3e50; margin-bottom: 20px;">🔍 找到您的许可证了！</h2>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">
              您好 <strong>${data.customerName || '用户'}</strong>，根据您提供的信息，我们找到了您的许可证。
            </p>
            
            <!-- License Key Box -->
            <div style="background: #f8f9fa; border: 2px solid #667eea; border-radius: 12px; padding: 25px; margin: 30px 0; text-align: center;">
              <h3 style="color: #667eea; margin-bottom: 15px; font-size: 18px;">🔑 您的许可证密钥</h3>
              <div style="background: white; padding: 20px; border-radius: 8px; border: 2px dashed #667eea;">
                <code style="font-size: 24px; font-weight: bold; color: #2c3e50; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                  ${data.licenseKey}
                </code>
              </div>
              <p style="color: #666; font-size: 14px; margin-top: 15px;">
                💡 此许可证可同时用于网页版和桌面版软件
              </p>
            </div>
            
            <!-- License Info -->
            <div style="background: #f0fff4; border-radius: 12px; padding: 25px; margin: 30px 0;">
              <h3 style="color: #27ae60; margin-bottom: 15px;">📋 许可证信息</h3>
              <p style="color: #666; margin: 5px 0;"><strong>状态：</strong> ${data.status === 'ACTIVE' ? '✅ 有效' : '❌ 无效'}</p>
              <p style="color: #666; margin: 5px 0;"><strong>激活时间：</strong> ${data.issuedAt ? new Date(data.issuedAt).toLocaleDateString('zh-CN') : '未知'}</p>
              <p style="color: #666; margin: 5px 0;"><strong>设备限制：</strong> ${data.maxDevices === -1 ? '无限设备' : `最多 ${data.maxDevices || 3} 台设备`}</p>
              <p style="color: #666; margin: 5px 0;"><strong>已激活设备：</strong> ${(data.activatedDevices && data.activatedDevices.length) || 0} 台</p>
            </div>
            
            <!-- Quick Access -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://icstudio.club/tools/sight-reading-generator.html" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; margin: 0 10px 10px 0;">
                🚀 立即使用
              </a>
              <a href="mailto:support@icstudio.club" style="background: #95a5a6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                💬 联系支持
              </a>
            </div>
            
            <!-- Security Notice -->
            <div style="background: #fff3cd; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <h4 style="color: #856404; margin-bottom: 10px;">🔒 安全提醒</h4>
              <p style="color: #856404; margin: 0; font-size: 14px;">
                如果您没有申请找回许可证，请忽略此邮件。为了保护您的账户安全，请勿将许可证密钥分享给他人。
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #2c3e50; color: #bdc3c7; padding: 20px 30px; text-align: center; font-size: 14px;">
            <p style="margin: 0 0 10px 0;">IC Studio - 让音乐学习更简单</p>
            <p style="margin: 0; opacity: 0.8;">此邮件是自动发送的，请勿直接回复</p>
          </div>
        </div>
      `,
      text: `
IC Studio 视奏工具 - 许可证信息

您好 ${data.customerName || '用户'}，

根据您的请求，这是您的许可证信息：

许可证密钥：${data.licenseKey}
状态：${data.status === 'ACTIVE' ? '有效' : '无效'}
设备限制：${data.maxDevices === -1 ? '无限设备' : `最多 ${data.maxDevices || 3} 台设备`}
已激活设备：${(data.activatedDevices && data.activatedDevices.length) || 0} 台

立即使用：https://icstudio.club/tools/sight-reading-generator.html

如需帮助，请联系：support@icstudio.club

IC Studio 团队
      `
    }
  },
  
  // 退款通知邮件模板
  'refund-notification': (data) => {
    return {
      subject: `💰 IC Studio 视奏工具 - 退款处理通知`,
      html: `
        <div style="font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">IC Studio</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 16px;">退款处理通知</p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #2c3e50; margin-bottom: 20px;">💰 您的退款已处理</h2>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">
              您好 <strong>${data.customerName || '用户'}</strong>，您的退款申请已经处理完成。
            </p>
            
            <!-- Refund Info -->
            <div style="background: #fff5f5; border: 2px solid #e74c3c; border-radius: 12px; padding: 25px; margin: 30px 0;">
              <h3 style="color: #e74c3c; margin-bottom: 15px; font-size: 18px;">📋 退款详情</h3>
              <p style="color: #666; margin: 8px 0;"><strong>订单号：</strong> ${data.orderId}</p>
              <p style="color: #666; margin: 8px 0;"><strong>退款金额：</strong> ¥${(data.refundAmount / 100).toFixed(2)}</p>
              <p style="color: #666; margin: 8px 0;"><strong>退款原因：</strong> ${data.refundReason}</p>
              <p style="color: #666; margin: 8px 0;"><strong>处理时间：</strong> ${new Date(data.refundProcessedAt).toLocaleDateString('zh-CN')}</p>
            </div>
            
            <!-- License Revocation Notice -->
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <h4 style="color: #2c3e50; margin-bottom: 10px;">🚫 许可证已失效</h4>
              <p style="color: #666; margin: 0;">
                由于退款已处理，您的许可证 <code style="background: #e9ecef; padding: 2px 6px; border-radius: 4px;">${data.licenseKey || '已隐藏'}</code> 已被自动吊销，软件和网页版功能将不再可用。
              </p>
            </div>
            
            <!-- Contact Info -->
            <div style="background: #f0fff4; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <h4 style="color: #27ae60; margin-bottom: 10px;">💬 还有疑问？</h4>
              <p style="color: #666; margin-bottom: 10px;">如对退款处理有任何疑问，请随时联系我们：</p>
              <p style="color: #666; margin: 0;">
                📧 <a href="mailto:support@icstudio.club" style="color: #667eea;">support@icstudio.club</a><br>
                🌐 <a href="https://icstudio.club" style="color: #667eea;">icstudio.club</a>
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #2c3e50; color: #bdc3c7; padding: 20px 30px; text-align: center; font-size: 14px;">
            <p style="margin: 0 0 10px 0;">感谢您曾经选择 IC Studio</p>
            <p style="margin: 0; opacity: 0.8;">此邮件是自动发送的，请勿直接回复</p>
          </div>
        </div>
      `,
      text: `
IC Studio 视奏工具 - 退款处理通知

您好 ${data.customerName || '用户'}，

您的退款申请已经处理完成：

订单号：${data.orderId}
退款金额：¥${(data.refundAmount / 100).toFixed(2)}
退款原因：${data.refundReason}
处理时间：${new Date(data.refundProcessedAt).toLocaleDateString('zh-CN')}

重要提醒：由于退款已处理，您的许可证已被自动吊销，软件功能将不再可用。

如有疑问，请联系：support@icstudio.club

IC Studio 团队
      `
    }
  }
}

exports.main = async (event, context) => {
  try {
    console.log('📧 邮件服务请求')
    
    // 解析请求数据
    let data = event
    if (event.body) {
      try {
        data = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
      } catch (e) {
        throw new Error('无效的请求数据格式')
      }
    }
    
    const action = data.action || 'send-license' // send-license | forgot-license | refund-notification
    
    console.log(`📬 邮件操作: ${action}`)
    
    // 根据动作执行不同的邮件发送
    switch (action) {
      
      case 'send-license':
        return await sendLicenseEmail(data)
        
      case 'forgot-license':
        return await sendForgotLicenseEmail(data)
        
      case 'refund-notification':
        return await sendRefundNotificationEmail(data)
        
      default:
        throw new Error(`未知的邮件操作: ${action}`)
    }
    
  } catch (error) {
    console.error('❌ 邮件服务操作失败:', error)
    
    // 记录错误日志
    try {
      await db.collection('error-logs').add({
        function: 'email-service',
        error: error.message,
        stack: error.stack,
        event: event,
        timestamp: new Date()
      })
    } catch (logError) {
      console.error('❌ 错误日志记录失败:', logError)
    }
    
    return {
      success: false,
      message: error.message || '邮件发送失败'
    }
  }
}

// 发送许可证激活邮件
async function sendLicenseEmail(data) {
  const { licenseId, licenseKey, customerEmail, customerName } = data
  
  if (!licenseKey || !customerEmail) {
    throw new Error('缺少必要参数：licenseKey 和 customerEmail')
  }
  
  // 获取许可证详细信息
  const licenseResult = await licensesCollection
    .where({ licenseKey: licenseKey })
    .get()
  
  if (licenseResult.data.length === 0) {
    throw new Error('许可证不存在')
  }
  
  const license = licenseResult.data[0]
  
  const emailId = generateEmailId()
  const templateData = {
    licenseKey: licenseKey,
    customerName: customerName || license.customerName,
    maxDevices: license.maxDevices,
    downloadLinks: {
      windows: `${process.env.DOWNLOAD_BASE_URL || 'https://download.icstudio.club'}/windows`,
      macos: `${process.env.DOWNLOAD_BASE_URL || 'https://download.icstudio.club'}/macos`,
      linux: `${process.env.DOWNLOAD_BASE_URL || 'https://download.icstudio.club'}/linux`
    }
  }
  
  const template = emailTemplates['license-activated'](templateData)
  
  const mailOptions = {
    from: `"IC Studio" <${emailConfig.auth.user}>`,
    to: customerEmail,
    subject: template.subject,
    html: template.html,
    text: template.text
  }
  
  const emailData = {
    emailId: emailId,
    recipientEmail: customerEmail,
    recipientName: customerName || license.customerName,
    subject: template.subject,
    template: 'license-activated',
    templateData: templateData,
    licenseId: license.licenseId,
    orderId: license.paymentOrderId
  }
  
  try {
    // 记录邮件为待发送
    await logEmail(emailData, 'PENDING')
    
    // 发送邮件
    const result = await transporter.sendMail(mailOptions)
    console.log('✅ 许可证激活邮件发送成功:', result.messageId)
    
    // 更新日志为已发送
    await logEmail(emailData, 'SENT')
    
    return {
      success: true,
      message: '许可证激活邮件发送成功',
      emailId: emailId,
      messageId: result.messageId
    }
    
  } catch (error) {
    console.error('❌ 邮件发送失败:', error)
    
    // 记录失败日志
    await logEmail(emailData, 'FAILED', error.message)
    
    throw new Error(`邮件发送失败: ${error.message}`)
  }
}

// 发送忘记访问码邮件
async function sendForgotLicenseEmail(data) {
  const { customerEmail, stripeCustomerId, alipayAccount } = data
  
  if (!customerEmail && !stripeCustomerId && !alipayAccount) {
    throw new Error('必须提供 customerEmail、stripeCustomerId 或 alipayAccount 其中之一')
  }
  
  // 构建查询条件
  let whereCondition = {}
  if (customerEmail) {
    whereCondition.customerEmail = customerEmail
  }
  
  // 查找许可证
  const licenseResult = await licensesCollection
    .where(whereCondition)
    .get()
  
  if (licenseResult.data.length === 0) {
    // 为了安全，不返回"未找到"，而是返回"如果存在会发送"
    return {
      success: true,
      message: '如果该账户存在有效许可证，我们已将信息发送至您的邮箱'
    }
  }
  
  // 获取最新的有效许可证
  const validLicenses = licenseResult.data.filter(license => license.status === 'ACTIVE')
  if (validLicenses.length === 0) {
    return {
      success: true,
      message: '如果该账户存在有效许可证，我们已将信息发送至您的邮箱'
    }
  }
  
  const license = validLicenses[0] // 使用最新的有效许可证
  
  const emailId = generateEmailId()
  const templateData = {
    licenseKey: license.licenseKey,
    customerName: license.customerName,
    status: license.status,
    issuedAt: license.issuedAt,
    maxDevices: license.maxDevices,
    activatedDevices: license.activatedDevices
  }
  
  const template = emailTemplates['forgot-license'](templateData)
  
  const mailOptions = {
    from: `"IC Studio" <${emailConfig.auth.user}>`,
    to: license.customerEmail,
    subject: template.subject,
    html: template.html,
    text: template.text
  }
  
  const emailData = {
    emailId: emailId,
    recipientEmail: license.customerEmail,
    recipientName: license.customerName,
    subject: template.subject,
    template: 'forgot-license',
    templateData: templateData,
    licenseId: license.licenseId,
    orderId: license.paymentOrderId
  }
  
  try {
    // 记录邮件为待发送
    await logEmail(emailData, 'PENDING')
    
    // 发送邮件
    const result = await transporter.sendMail(mailOptions)
    console.log('✅ 忘记访问码邮件发送成功:', result.messageId)
    
    // 更新日志为已发送
    await logEmail(emailData, 'SENT')
    
    return {
      success: true,
      message: '如果该账户存在有效许可证，我们已将信息发送至您的邮箱',
      emailId: emailId
    }
    
  } catch (error) {
    console.error('❌ 邮件发送失败:', error)
    
    // 记录失败日志
    await logEmail(emailData, 'FAILED', error.message)
    
    // 为了安全，即使邮件发送失败也返回成功消息
    return {
      success: true,
      message: '如果该账户存在有效许可证，我们已将信息发送至您的邮箱'
    }
  }
}

// 发送退款通知邮件
async function sendRefundNotificationEmail(data) {
  const { 
    orderId, 
    licenseKey, 
    customerEmail, 
    customerName, 
    refundAmount, 
    refundReason,
    refundProcessedAt
  } = data
  
  if (!customerEmail || !orderId) {
    throw new Error('缺少必要参数：customerEmail 和 orderId')
  }
  
  const emailId = generateEmailId()
  const templateData = {
    orderId: orderId,
    licenseKey: licenseKey,
    customerName: customerName,
    refundAmount: refundAmount,
    refundReason: refundReason || '用户申请退款',
    refundProcessedAt: refundProcessedAt || new Date()
  }
  
  const template = emailTemplates['refund-notification'](templateData)
  
  const mailOptions = {
    from: `"IC Studio" <${emailConfig.auth.user}>`,
    to: customerEmail,
    subject: template.subject,
    html: template.html,
    text: template.text
  }
  
  const emailData = {
    emailId: emailId,
    recipientEmail: customerEmail,
    recipientName: customerName,
    subject: template.subject,
    template: 'refund-notification',
    templateData: templateData,
    licenseId: null,
    orderId: orderId
  }
  
  try {
    // 记录邮件为待发送
    await logEmail(emailData, 'PENDING')
    
    // 发送邮件
    const result = await transporter.sendMail(mailOptions)
    console.log('✅ 退款通知邮件发送成功:', result.messageId)
    
    // 更新日志为已发送
    await logEmail(emailData, 'SENT')
    
    return {
      success: true,
      message: '退款通知邮件发送成功',
      emailId: emailId,
      messageId: result.messageId
    }
    
  } catch (error) {
    console.error('❌ 退款通知邮件发送失败:', error)
    
    // 记录失败日志
    await logEmail(emailData, 'FAILED', error.message)
    
    throw new Error(`退款通知邮件发送失败: ${error.message}`)
  }
}