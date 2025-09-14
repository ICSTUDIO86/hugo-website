# 30条旋律计数系统部署指南

## 🎯 系统特性

全新的**基于服务端的严格计数系统**，彻底解决刷新绕过问题：

- ✅ **每台设备限制30条旋律**（不是时间限制）
- ✅ **刷新无法绕过** - 计数存储在服务端
- ✅ **清除浏览器数据无法重置** - 基于设备指纹识别
- ✅ **重新部署网站不影响计数** - 服务端持久化存储
- ✅ **实时显示剩余次数** - 用户清楚知道使用情况

## 📋 部署步骤

### 第一步：部署 CloudBase 函数

```bash
cd /Users/igorchen/IC\ WEB/pehtheme-hugo/cloudbase-functions

# 部署新的计数函数
cloudbase functions:deploy trialCounter

# 验证部署
cloudbase functions:list
```

### 第二步：创建数据库集合

在 CloudBase 控制台创建 `device_melody_trials` 集合：

```javascript
// 集合结构
{
  "_id": "...",
  "device_hash": "sha256设备哈希",
  "client_ip": "IP地址",
  "user_agent": "浏览器标识",
  "device_fingerprint": "设备指纹",
  "melody_count": 15,          // 已生成旋律数
  "max_count": 30,              // 最大允许数
  "first_use": "2024-01-01T00:00:00Z",
  "last_use": "2024-01-01T12:00:00Z",
  "melody_history": [           // 生成历史
    {
      "index": 1,
      "timestamp": "2024-01-01T00:00:00Z",
      "ip": "127.0.0.1"
    }
  ],
  "created_at": "2024-01-01T00:00:00Z"
}
```

### 第三步：更新前端页面

#### 方案A：完全替换（推荐用于生产环境）

在 `tools/sight-reading-generator.html` 的 `</body>` 标签前：

```html
<!-- 移除旧的试用系统 -->
<!-- <!-- 时间限制已移除，改为数量限制 --> -->

<!-- 添加新的计数系统 -->
<script src="/js/melody-counter-system.js"></script>
```

#### 方案B：条件加载（用于测试）

```html
<script>
// 根据环境选择系统
if (window.location.hostname === 'icstudio.club') {
  // 线上环境使用严格计数系统
  document.write('<script src="/js/melody-counter-system.js"><\/script>');
} else {
  // 本地保留旧系统（可选）
  // 时间限制已移除，改为数量限制
}
</script>
```

### 第四步：移除调试后门

**重要：删除所有可能被利用的调试函数**

搜索并删除以下函数：
- `forceResetTrial()`
- `resetTrialTime()`
- `debugTrialStatus()`
- `superActivate()`
- `forceUnlock()`

在 `sight-reading-generator.html` 中删除这些代码块：

```javascript
// 删除这些调试函数
function forceResetTrial() { ... }
function resetTrialTime() { ... }
function debugTrialStatus() { ... }
// ... 其他调试函数
```

## 🔧 工作原理

### 1. 用户点击"生成旋律"
```javascript
用户点击 → 发送请求到服务端 → 验证剩余次数
         ↓                          ↓
    如果允许 ← 返回验证结果 ← 更新计数
         ↓
    生成旋律
```

### 2. 设备识别机制
- **设备指纹** = 浏览器信息 + 屏幕信息 + 硬件信息 + Canvas/WebGL指纹
- **设备哈希** = SHA256(设备指纹 + IP + UserAgent)
- **唯一性保证** = 同一设备在不同浏览器会有不同指纹，但刷新不变

### 3. 计数逻辑
- 首次访问：创建记录，赋予30次机会
- 后续访问：检查已用次数，决定是否允许
- 用完30次：显示购买提示，禁用生成按钮

## 🧪 测试验证

### 1. 功能测试

```bash
# 测试计数接口
curl -X POST "https://cloud1-4g1r5ho01a0cfd85.service.tcloudbase.com/trialCounter" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "check",
    "deviceFingerprint": "test_device_123",
    "userAgent": "Mozilla/5.0 Test"
  }'
```

### 2. 绕过测试清单

- [ ] 刷新页面 → **无法重置计数**
- [ ] 清除localStorage → **无法重置计数**
- [ ] 清除所有浏览器数据 → **无法重置计数**
- [ ] 无痕浏览模式 → **相同设备仍被识别**
- [ ] 切换浏览器 → **新的30次机会**（不同设备指纹）
- [ ] 修改系统时间 → **无效果**
- [ ] 重新部署网站 → **计数保持不变**

### 3. 监控日志

```bash
# 查看函数日志
cloudbase functions:log trialCounter --limit 50

# 查看数据库记录
cloudbase database:export device_melody_trials
```

## 📊 用户界面

### 试用状态显示

系统会在生成按钮下方显示：

```
🎉 欢迎试用！
您有 30 条免费旋律

[=========>          ] 15/30
已使用: 15 条 | 剩余: 15 条
```

### 试用结束显示

```
😔 试用次数已用完
您已生成了 30 条旋律
请购买完整版继续使用

[生成旋律按钮变为"试用已结束"并禁用]
```

## ⚠️ 注意事项

1. **访问码优先级**：如果用户有有效访问码，自动跳过试用限制
2. **网络依赖**：需要网络连接才能验证，离线无法使用
3. **性能优化**：每次生成都需要网络请求，建议优化加载动画
4. **用户体验**：清晰显示剩余次数，避免用户困惑

## 🔄 回滚方案

如果需要回滚到旧系统：

1. 注释新系统引用
```html
<!-- <script src="/js/melody-counter-system.js"></script> -->
```

2. 恢复旧系统
```html
<!-- 时间限制已移除，改为数量限制 -->
```

3. （可选）删除CloudBase函数
```bash
cloudbase functions:delete trialCounter
```

## 📈 数据分析

查看试用数据统计：

```javascript
// 在CloudBase控制台运行
db.collection('device_melody_trials')
  .aggregate()
  .group({
    _id: null,
    totalDevices: { $sum: 1 },
    totalMelodies: { $sum: '$melody_count' },
    avgMelodies: { $avg: '$melody_count' },
    maxUsage: { $max: '$melody_count' }
  })
  .end()
```

## 🎉 部署完成后

- **用户体验**：清晰看到剩余次数，知道何时需要购买
- **防作弊**：刷新、清除数据等手段完全无效
- **数据追踪**：可以分析用户使用习惯，优化产品
- **转化率提升**：精确的30条限制，促进购买决策

---

**部署完成后，每台设备严格限制30条旋律，刷新无法绕过！**