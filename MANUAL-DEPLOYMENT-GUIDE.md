# 手动部署指南 - 试用系统修复

## 📋 当前状态
✅ **代码修复完成**：试用系统现在强制在所有生产环境使用服务端验证
✅ **本地构建完成**：`public/` 目录包含最新的修复
✅ **源文件已提交**：修复已保存到本地Git仓库
❌ **需要手动推送**：SSH密钥问题导致自动部署失败

## 🚀 部署步骤

### 方法1：修复SSH并推送（推荐）
```bash
# 1. 推送源文件到主仓库（如果SSH修复后）
cd "/Users/igorchen/IC WEB/pehtheme-hugo"
git push origin main

# 2. 部署到GitHub Pages
hugo --cleanDestinationDir
./push-public-to-github.sh
```

### 方法2：手动复制文件到GitHub（如果SSH问题持续）

1. **访问GitHub网页界面**：
   - 打开 https://github.com/ICSTUDIO86/hugo-website
   - 手动上传/替换以下关键文件：

2. **关键修复文件**：
   ```
   js/melody-counter-system.js          （新增）
   tools/sight-reading-generator.html   （更新）
   ```

3. **或者导出整个public文件夹**：
   - 将 `public/` 目录下的所有文件复制到GitHub Pages仓库

## 🔍 验证修复

部署完成后，访问您的网站并检查浏览器控制台：

**正确输出应该是**：
```
🔍 Hostname检测调试信息:
  - hostname: icstudio86.github.io (或其他域名)
  - isProduction: true
🌐 检测到生产环境，强制使用服务端模式
```

**错误输出（需要修复）**：
```
🏠 使用本地模式 - 原因: localhost
```

## 🛡️ 修复内容

### 核心修复
- **域名检测强化**：现在检测所有生产域名（github.io, .com, .net, .org等）
- **强制服务端验证**：生产环境无法使用localStorage本地模式
- **试用限制**：20个旋律限制，基于CloudBase设备指纹追踪

### 安全提升
- ❌ 无法通过刷新页面重置试用
- ❌ 无法通过清除浏览器数据绕过
- ❌ 无法通过隐身模式重置
- ✅ 基于设备硬件指纹的服务端追踪

## 📞 如果还有问题

如果部署后试用系统仍然是本地模式：

1. **清除浏览器缓存**（强制刷新 Cmd+Shift+R）
2. **检查控制台输出**确认域名检测结果
3. **确认访问的域名**是否在生产域名列表中

## 🎯 修复验证清单

- [ ] 网站部署完成
- [ ] 浏览器控制台显示"检测到生产环境"
- [ ] 试用计数使用服务端验证
- [ ] 刷新页面无法重置试用次数
- [ ] 试用限制为20个旋律

---
🤖 Generated with [Claude Code](https://claude.ai/code)