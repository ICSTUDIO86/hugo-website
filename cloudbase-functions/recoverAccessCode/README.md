# IC Studio 访问码找回云函数

通过支付宝账号查找用户购买的访问码和订单信息的云函数。

## 功能说明

用户可以通过输入当时用于支付的支付宝账号（手机号或邮箱），找回忘记的访问码和订单号。

## API 接口

### 请求地址
```
https://your-env-id.service.tcloudbase.com/recoverAccessCode
```

### 请求方法
```
POST
```

### 请求参数
```json
{
  "alipay_account": "138****1234",  // 支付宝账号（手机号或邮箱）
  "timestamp": 1640995200000        // 当前时间戳（可选，用于防重放攻击）
}
```

### 响应格式

#### 成功响应
```json
{
  "success": true,
  "data": [
    {
      "access_code": "A1B2C3D4E5F6",
      "order_id": "IC20240101123456",
      "purchase_time": "2024-01-01T12:00:00Z",
      "product_name": "IC Studio 视奏工具",
      "amount": "1.00"
    }
  ],
  "message": "找到 1 条相关记录"
}
```

#### 失败响应
```json
{
  "success": false,
  "error": "未找到相关订单记录",
  "code": "NO_RECORDS_FOUND"
}
```

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| `MISSING_ACCOUNT` | 未提供支付宝账号 |
| `INVALID_ACCOUNT_FORMAT` | 支付宝账号格式不正确 |
| `NO_RECORDS_FOUND` | 未找到相关订单记录 |
| `NO_VALID_ACCESS_CODES` | 未找到有效的访问码记录 |
| `INTERNAL_ERROR` | 内部服务器错误 |

## 数据库结构要求

### orders 集合字段说明
```javascript
{
  _id: "订单ID",
  out_trade_no: "商户订单号",
  access_code: "访问码",
  status: "订单状态（paid/pending/cancelled）",
  buyer_account: "买家支付宝账号",
  alipay_account: "支付宝账号（备选字段）",
  buyer_email: "买家邮箱",
  buyer_phone: "买家手机号",
  product_name: "商品名称",
  amount: "订单金额",
  created_time: "创建时间",
  pay_time: "支付时间",
  payment_info: {
    buyer_account: "支付信息中的买家账号"
  }
}
```

### access_logs 集合（可选）
用于记录查询日志，便于分析和安全监控：
```javascript
{
  action: "recover_access_code",
  alipay_account: "查询的支付宝账号",
  found_count: "找到的记录数量",
  client_ip: "客户端IP",
  user_agent: "用户代理",
  timestamp: "查询时间",
  request_id: "请求ID"
}
```

## 部署步骤

### 1. 安装依赖
```bash
cd /path/to/cloudbase-functions/recoverAccessCode
npm install
```

### 2. 配置环境
确保 CloudBase CLI 已安装并登录：
```bash
npm install -g @cloudbase/cli
tcb login
```

### 3. 部署函数
```bash
tcb functions:deploy recoverAccessCode --envId your-env-id
```

### 4. 设置HTTP访问
在 CloudBase 控制台中：
1. 进入云函数管理页面
2. 选择 `recoverAccessCode` 函数
3. 在"触发器"标签页添加 HTTP 触发器
4. 设置路径为 `/recoverAccessCode`

## 安全考虑

1. **数据脱敏**：返回的数据中敏感信息已脱敏
2. **访问限制**：建议设置函数访问频率限制
3. **日志记录**：记录查询日志用于安全监控
4. **参数验证**：严格验证输入参数格式
5. **权限控制**：确保只返回已支付订单的信息

## 注意事项

1. **数据库字段适配**：根据实际数据库结构调整字段名
2. **时区处理**：注意时间字段的时区转换
3. **性能优化**：对常用查询字段建立索引
4. **错误处理**：完善的错误处理和用户友好的错误提示

## 测试

### 本地测试
```javascript
// 测试用例
const event = {
  alipay_account: "138****1234",
  timestamp: Date.now()
};

// 调用函数进行测试
const result = await main(event, { requestId: 'test-123' });
console.log(result);
```

### 线上测试
使用 CloudBase 控制台的函数测试功能，或通过 HTTP 请求测试：

```bash
curl -X POST https://your-env-id.service.tcloudbase.com/recoverAccessCode \
  -H "Content-Type: application/json" \
  -d '{"alipay_account":"test@example.com","timestamp":1640995200000}'
```

## 维护和监控

- 定期查看云函数执行日志
- 监控函数执行时长和错误率
- 定期清理过期的访问日志
- 根据使用情况调整函数配置