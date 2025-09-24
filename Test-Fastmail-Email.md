# 📧 Fastmail 邮件发送测试指南

## 🎯 测试目标

验证 Fastmail + Nodemailer 邮件发送功能是否正常工作。

## 🧪 测试方法

### 方法1：真实购买测试 (推荐)
1. 在 Gumroad 进行小额购买测试 ($0.99 或最低金额)
2. 购买完成后 1-2 分钟内检查：
   - 购买者邮箱是否收到访问码邮件
   - 云函数日志是否显示发送成功

### 方法2：使用测试脚本
运行现有的测试脚本：
```bash
cd /Users/igorchen/IC\ WEB/pehtheme-hugo
node cloudbase-functions/test-gumroad-webhook.js
```

## 🔍 成功标志

### ✅ 云函数日志中应该显示：
```
🎯 访问码已生成: K9MQLXBSUV2
📧 访问码邮件已通过 Fastmail 发送成功: user@example.com
```

### ✅ 用户邮箱中应该收到：
- **发件人**: service@icstudio.club
- **主题**: 🎉 您的 IC Studio 视奏工具访问码
- **内容**: 包含访问码、订单信息、使用说明等

## ❌ 失败排查

### 如果云函数日志显示：
```
⚠️ Fastmail 邮件发送失败: [错误信息]
```

**可能原因：**
1. 环境变量配置错误
2. Fastmail App Password 无效
3. FROM_EMAIL 域名未验证

### 解决方案：
1. 检查环境变量是否正确设置
2. 确认 App Password 没有输入错误
3. 暂时使用 `FROM_EMAIL=icstudio@fastmail.com` 测试

## 📊 预期的完整流程

```
用户 Gumroad 购买
    ↓ (立即)
Gumroad 发送购买确认邮件
    ↓ (1-2秒)
Gumroad 触发 Webhook
    ↓
云函数生成访问码
    ↓
通过 Fastmail 发送访问码邮件
    ↓ (几秒内)
用户收到两封邮件：
1. Gumroad 购买确认
2. IC Studio 访问码邮件 ✨
```

## 🎉 测试成功后

如果测试成功，您的 Gumroad 集成就完全就绪了！用户购买后会自动收到访问码，无需任何人工干预。

## 📞 如遇问题

请提供：
1. 云函数日志内容
2. 是否收到邮件
3. 任何错误信息

这样我可以快速帮您定位问题。