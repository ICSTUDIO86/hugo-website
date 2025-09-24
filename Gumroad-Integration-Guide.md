# IC Studio - Gumroad 集成配置指南

## 🎯 概述

本指南将帮助您将 Gumroad 支付系统与 IC Studio 视奏工具完全集成，实现自动化的访问码生成和退款处理。

## ✅ 完成状态

- ✅ **CloudBase 云函数已部署**
- ✅ **销售事件处理** - 自动生成访问码并存储到数据库
- ✅ **退款事件处理** - 自动失效访问码并更新数据库
- ✅ **邮件通知系统** - 发送访问码和退款通知（需配置邮件服务）
- ✅ **完全兼容现有系统** - 与支付宝订单使用相同的数据库结构

## 🔗 Webhook 信息

### **Webhook URL**
```
https://cloud1-4g1r5ho01a0cfd85.service.tcloudbase.com/gumroad-webhook
```

### **云函数名称**
```
processGumroadWebhook
```

## 📋 Gumroad 后台配置步骤

### 步骤 1：登录 Gumroad Dashboard
1. 访问 [Gumroad.com](https://gumroad.com) 并登录
2. 进入产品管理页面

### 步骤 2：配置产品 Webhook
1. 选择您的 "IC Studio 视奏工具" 产品
2. 点击 **Settings** (设置)
3. 找到 **Advanced** (高级设置) 部分
4. 点击 **Webhooks** 选项

### 步骤 3：添加 Webhook
配置以下信息：

**Webhook URL:**
```
https://cloud1-4g1r5ho01a0cfd85.service.tcloudbase.com/gumroad-webhook
```

**事件类型选择:**
- ✅ `sale` - 销售完成事件
- ✅ `refund` - 退款事件
- ✅ `dispute` - 争议事件

**HTTP 方法:** `POST`

### 步骤 4：保存配置
1. 点击 **Add Webhook** 保存配置
2. Gumroad 会自动测试 Webhook 连接
3. 确认显示 ✅ 连接成功

## 🔄 工作流程

### 用户购买流程
```
用户在Gumroad购买
    ↓
Gumroad处理支付
    ↓
Gumroad发送sale事件到CloudBase
    ↓
自动生成11-12位访问码
    ↓
存储到codes和orders集合
    ↓
发送访问码邮件给购买者
    ↓
用户收到邮件，获得访问码
```

### 用户退款流程
```
用户在Gumroad申请退款
    ↓
Gumroad处理退款
    ↓
Gumroad发送refund事件到CloudBase
    ↓
查找对应的访问码
    ↓
标记codes.status='refunded'
    ↓
标记orders.refund_status='refunded'
    ↓
记录退款日志到refund_logs
    ↓
发送退款通知邮件
    ↓
访问码立即失效
```

## 📊 数据库结构

### Gumroad 订单在数据库中的存储格式

**codes 集合:**
```javascript
{
  access_code: "S7KNQLUBKSUV",
  order_no: "GRTEST456",           // GR前缀标识Gumroad订单
  amount: "48.00",
  status: "paid",                  // 或 "refunded"
  product_name: "IC Studio 视奏工具",
  source: "gumroad",               // 标识来源
  gumroad_order_id: "TEST456",     // 原始Gumroad订单ID
  buyer_email: "user@example.com",
  created_at: "2025-09-15T14:02:00.000Z",
  // 退款时新增字段:
  refund_time: "2025-09-15T14:02:21.000Z",
  refund_amount: "48.00",
  refund_order_no: "GRF1757944940924"
}
```

**orders 集合:**
```javascript
{
  out_trade_no: "GRTEST456",       // 商家订单号
  gumroad_order_id: "TEST456",     // Gumroad原始订单ID
  access_code: "S7KNQLUBKSUV",
  status: "paid",
  refund_status: "refunded",       // 退款时更新
  money: "48.00",
  name: "IC Studio 视奏工具",
  buyer_email: "user@example.com",
  source: "gumroad",
  paid_at: "2025-09-15T14:02:00.000Z",
  // 退款时新增字段:
  refund_time: "2025-09-15T14:02:21.000Z",
  refund_amount: "48.00",
  refund_order_no: "GRF1757944940924",
  access_code_refunded: "S7KNQLUBKSUV"
}
```

## 🔍 现有功能完美兼容

### 查找访问码功能
`findAccessCodeByOrderNo` 云函数自动支持 Gumroad 订单：
- 输入订单号 `GRTEST456` → 返回对应访问码
- 自动检查退款状态，退款订单返回 "此订单已退款，访问码无效"

### 访问码验证功能
现有的访问码验证逻辑自动适配：
- `codes.status === 'refunded'` → 访问码失效
- `orders.refund_status === 'refunded'` → 订单已退款

### 退款检查功能
所有现有的退款检查逻辑都会自动生效于 Gumroad 订单。

## 📧 邮件服务配置（可选）

当前邮件功能已准备就绪，但需要配置实际的邮件发送服务：

### 推荐的邮件服务选项
1. **腾讯云 SES** - 与 CloudBase 完美集成
2. **SendGrid** - 稳定可靠
3. **Amazon SES** - 经济实惠

### 配置方法
修改云函数中的 `sendAccessCodeEmail` 和 `sendRefundNotificationEmail` 函数，替换：
```javascript
// TODO: 集成实际的邮件发送服务
console.log('📧 邮件内容已准备，等待邮件服务配置');
```

为实际的邮件发送 API 调用。

## 🧪 测试验证

### 功能测试状态
- ✅ **销售事件处理** - 测试通过，访问码：`S7KNQLUBKSUV`
- ✅ **退款事件处理** - 测试通过，访问码已失效
- ✅ **数据库存储** - codes 和 orders 集合正确写入
- ✅ **退款日志** - refund_logs 集合正确记录

### 测试订单信息
```
测试订单号: GRTEST456
生成访问码: S7KNQLUBKSUV
测试邮箱: test@example.com
处理时间: 2025-09-15 14:02
状态: ✅ 销售 → ✅ 退款失效
```

## 🎉 完成！

现在您的 Gumroad 产品已完全集成到 IC Studio 系统中：

1. **用户体验一致** - Gumroad 用户和支付宝用户获得相同的访问码体验
2. **自动化流程** - 无需人工干预，购买和退款全自动处理
3. **数据完整性** - 所有订单信息完整存储，支持现有查找和管理功能
4. **失效机制** - 退款时访问码立即失效，保护商业利益

### 下一步
1. 在 Gumroad 后台按照上述步骤配置 Webhook
2. 进行一次真实的小额测试购买验证流程
3. （可选）配置邮件服务以启用自动邮件通知

如有任何问题，请检查 CloudBase 云函数日志或联系技术支持。