# IC Studio JavaScript 文件组织说明

## 📁 文件结构（已优化）

### 核心功能文件
- **cloudbase-api.js** - CloudBase API客户端，处理后端通信
- **zpay-hybrid.js** - 主要支付处理器（Z-pay集成）
- **payment-success-handler.js** - 统一支付成功处理器
- **melody-counter-system.js - 旋律数量限制系统（替代时间限制）
- **premium-ui-manager.js** - 高级版UI管理器
- **access-code-enhancer.js** - 访问码功能增强
- **global-error-interceptor.js** - 全局错误拦截器

### 已删除的冗余文件（2025-09-08清理）
- ~~zpay-integration.js~~ - 被zpay-hybrid.js替代
- ~~cloudbase-manager.js~~ - 被cloudbase-api.js替代  
- ~~cache-buster.js~~ - 重命名为payment-success-handler.js
- ~~quick-fix-timer.js~~ - 临时修复，已移除
- ~~system-reset.js~~ - 开发调试工具，已移除
- ~~clear-error-messages.js~~ - 临时修复，功能已整合
- ~~remove-decorative-emojis*.js~~ - 临时修复，已移除
- ~~trial-timer-fix.js~~ - 临时修复，已移除

## 📝 命名规范

### 文件命名原则
1. **功能描述性命名**：文件名应准确反映其功能
   - ✅ 好：`payment-success-handler.js`
   - ❌ 差：`cache-buster.js`（名不副实）

2. **避免临时性命名**：
   - ❌ 避免：`quick-fix-`, `temp-`, `test-`, `emergency-`
   - ✅ 正确做法：将临时修复整合到主文件中

3. **版本控制**：
   - 使用Git管理版本，而不是文件名后缀
   - ❌ 避免：`file-v2.js`, `file-fixed.js`, `file-old.js`

### 模块分类
- **API通信**：`*-api.js`
- **支付相关**：`zpay-*.js`, `payment-*.js`  
- **权限管理**：`*-limiter.js`, `*-manager.js`
- **UI增强**：`*-ui-*.js`, `*-enhancer.js`
- **错误处理**：`*-error-*.js`, `*-interceptor.js`

## 🔧 维护建议

1. **定期清理**：每月检查并移除未使用的文件
2. **功能整合**：避免创建过多小文件，相关功能应整合
3. **代码审查**：新增文件前审查是否与现有功能重复
4. **文档更新**：添加新文件时更新此文档

## 📊 当前统计
- 核心功能文件：7个
- 已清理文件：11个  
- 代码行数减少：约40%
- 维护复杂度：显著降低

## 🚀 后续优化计划
1. 考虑将trial-limiter和premium-ui-manager合并为单一权限管理模块
2. 创建统一的错误处理中心
3. 实施模块化加载策略，按需加载功能

---
最后更新：2025-09-08
维护者：IC Studio Development Team