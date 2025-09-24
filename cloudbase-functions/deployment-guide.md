# CloudBase 云函数部署指南

## 试用验证系统部署

### 1. 准备工作

1. 确保已有腾讯云账号和CloudBase环境
2. 安装CloudBase CLI工具：
   ```bash
   npm install -g @cloudbase/cli
   ```

3. 登录CloudBase：
   ```bash
   tcb login
   ```

### 2. 创建云函数

1. 在CloudBase控制台创建新的云函数：
   - 函数名：`trialVerification`
   - 运行环境：Node.js 16
   - 内存：128MB
   - 超时时间：10秒

2. 上传函数代码：
   ```bash
   tcb functions:deploy trialVerification --dir ./cloudbase-functions/
   ```

### 3. 配置数据库

在CloudBase数据库中创建以下集合：

#### 集合1: `trial_records`
- 用途：存储设备试用记录
- 字段结构：
  ```json
  {
    "_id": "自动生成",
    "fingerprint": "设备指纹字符串",
    "usageCount": 0,
    "maxUsage": 3,
    "firstUse": null,
    "lastUse": null,
    "sessions": [],
    "createdAt": "2025-09-20T08:00:00.000Z",
    "updatedAt": "2025-09-20T08:00:00.000Z"
  }
  ```

#### 集合2: `trial_usage_logs`
- 用途：记录详细使用日志
- 字段结构：
  ```json
  {
    "_id": "自动生成",
    "fingerprint": "设备指纹字符串",
    "sessionId": "会话ID",
    "userAgent": "用户代理字符串",
    "url": "访问URL",
    "referrer": "来源页面",
    "usageCount": 1,
    "timestamp": "2025-09-20T08:00:00.000Z",
    "clientIP": "客户端IP"
  }
  ```

### 4. 设置数据库权限

在CloudBase控制台设置数据库权限：

```javascript
// 权限规则示例
{
  "read": false,  // 客户端不能直接读取
  "write": false  // 客户端不能直接写入
}
```

### 5. 配置HTTP访问

1. 在云函数设置中启用HTTP访问服务
2. 记录生成的访问URL：
   ```
   https://cloud1-xxx.ap-shanghai.app.tcloudbase.com/trialVerification
   ```

3. 更新前端代码中的API端点URL

### 6. 测试部署

使用以下测试请求验证部署：

```javascript
// 测试请求
const testRequest = {
  fingerprint: "test123456",
  sessionId: "session123",
  action: "check",
  timestamp: Date.now(),
  userAgent: "Mozilla/5.0...",
  url: "https://icstudio.me/tools/sight-reading-generator.html",
  referrer: "https://icstudio.me/"
};

fetch('https://your-cloudbase-url/trialVerification', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Request-Source': 'IC-Studio-Trial-Protection'
  },
  body: JSON.stringify(testRequest)
});
```

### 7. 监控和日志

1. 在CloudBase控制台查看函数调用日志
2. 监控数据库使用情况
3. 设置告警规则

### 8. 安全配置

1. **域名白名单**：限制只有icstudio.me域名可以调用
2. **访问频率限制**：防止恶意请求
3. **IP黑名单**：阻止异常IP访问

### 9. 性能优化

1. **缓存优化**：合理使用CloudBase缓存
2. **数据库索引**：为fingerprint字段创建索引
3. **请求合并**：批量处理相似请求

### 10. 成本控制

1. **免费额度**：充分利用CloudBase免费额度
2. **资源监控**：定期检查资源使用情况
3. **优化策略**：根据使用模式调整配置

## 更新代码

如需更新云函数代码：

```bash
# 更新特定函数
tcb functions:deploy trialVerification --dir ./cloudbase-functions/

# 查看部署状态
tcb functions:list

# 查看函数日志
tcb functions:log trialVerification
```

## 故障排除

### 常见问题

1. **函数调用失败**：
   - 检查网络连接
   - 验证API端点URL
   - 查看函数日志

2. **数据库连接失败**：
   - 检查数据库权限配置
   - 验证集合是否存在

3. **跨域问题**：
   - 配置CORS允许的域名
   - 检查请求头设置

### 调试技巧

1. 使用CloudBase控制台的实时日志功能
2. 在函数中添加详细的console.log输出
3. 使用PostMan等工具测试API端点

## 备份和恢复

定期备份试用记录数据：

```bash
# 导出数据
tcb database:export trial_records --file trial_records_backup.json

# 导入数据
tcb database:import trial_records --file trial_records_backup.json
```