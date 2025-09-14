# 严格试用系统部署指南

## 🎯 目标

实现基于服务端的严格试用验证系统：
- ✅ 每台设备只能试用10分钟
- ✅ 无法通过刷新、清除存储等方式绕过
- ✅ 即使重新部署网站也无法重置试用时间
- ✅ 移除所有客户端绕过机制

## 📋 部署步骤

### 1. 部署 CloudBase 函数

```bash
cd /Users/igorchen/IC\ WEB/pehtheme-hugo/cloudbase-functions

# 部署新的 validateTrial 函数
cloudbase functions:deploy validateTrial

# 验证部署
cloudbase functions:list
```

### 2. 创建数据库集合

在 CloudBase 控制台创建 `device_trials` 集合，用于存储设备试用记录：

```javascript
// 集合结构示例
{
  "_id": "...",
  "device_hash": "sha256 设备哈希",
  "client_ip": "用户IP地址",
  "user_agent": "浏览器标识",
  "device_fingerprint": "设备指纹",
  "trial_start": 1704067200000,
  "trial_duration": 600000,
  "total_usage": 120000,
  "last_access": 1704067320000,
  "access_count": 5,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

### 3. 更新前端页面

#### 方案A：替换现有系统（推荐）

在 `tools/sight-reading-generator.html` 中：

1. **移除旧的试用系统引用**：
```html
<!-- 删除这些行 -->
<!-- 时间限制已移除，改为数量限制 -->
<!-- 删除所有调试函数 -->
```

2. **添加新的严格试用系统**：
```html
<!-- 在 </body> 前添加 -->
<script src="/js/strict-trial-system.js"></script>
```

3. **移除调试函数**：
删除所有 `forceResetTrial()`, `resetTrialTime()`, `debugTrialStatus()` 等调试函数

#### 方案B：并行部署（测试用）

保留现有系统，添加环境检测：
```html
<script>
// 在线上环境使用严格系统
if (window.location.hostname === 'icstudio.club') {
  document.write('<script src="/js/strict-trial-system.js"><\/script>');
} else {
  // 时间限制已移除，改为数量限制
}
</script>
```

### 4. 权限检查集成

确保 `checkFullAccess()` 函数正常工作：

```javascript
// 在严格试用系统初始化前检查
function checkFullAccess() {
  // 检查访问码：ic-sight-reading-license, ic-premium-access
  // 如果有有效访问码，返回 true，跳过试用限制
  return false; // 默认需要试用验证
}
```

## 🔧 系统特性

### 服务端验证机制
- **设备识别**：基于设备指纹 + IP + User-Agent 生成唯一哈希
- **时间跟踪**：在 CloudBase 数据库中记录精确的试用时间
- **实时验证**：每30秒向服务端验证一次状态
- **防篡改**：客户端无法修改试用状态

### 安全特性
- ❌ **移除豁免期机制**：不再有 `ic-anticheat-exempt`
- ❌ **移除调试函数**：删除所有重置和绕过函数
- ❌ **移除客户端存储依赖**：不依赖 localStorage
- ✅ **服务端权威**：所有决策由服务端做出

## 🧪 测试验证

### 1. 功能测试
```bash
# 测试新设备首次访问
curl -X POST "https://cloud1-4g1r5ho01a0cfd85.service.tcloudbase.com/validateTrial" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceFingerprint": "test_fingerprint_123",
    "timestamp": '$(date +%s000)',
    "userAgent": "Mozilla/5.0 Test Browser"
  }'
```

### 2. 绕过测试
- ✅ 刷新页面无法重新试用
- ✅ 清除浏览器数据无法重新试用
- ✅ 无痕浏览无法绕过（相同设备指纹）
- ✅ 重新部署网站无法重置（服务端状态保持）

### 3. 验证日志
检查 CloudBase 函数日志：
```bash
cloudbase functions:log validateTrial
```

## ⚠️ 重要提醒

1. **备份现有系统**：在部署前备份现有的试用系统文件
2. **渐进式部署**：建议先在测试环境验证，再部署到生产环境
3. **监控日志**：部署后密切监控 CloudBase 函数日志
4. **用户体验**：确保网络异常时的降级处理

## 🔄 回滚方案

如果新系统出现问题，可以快速回滚：

1. **移除新系统引用**：
```html
<!-- 注释或删除 -->
<!-- <script src="/js/strict-trial-system.js"></script> -->
```

2. **恢复旧系统**：
```html
<!-- 恢复 -->
<!-- 时间限制已移除，改为数量限制 -->
```

3. **删除 CloudBase 函数**（可选）：
```bash
cloudbase functions:delete validateTrial
```

## 📞 支持

部署过程中如有问题：
1. 检查 CloudBase 函数日志
2. 验证网络连接
3. 确认数据库权限设置
4. 联系技术支持

---

**部署完成后，每台设备将严格限制在10分钟试用时间内，无任何绕过机制！**