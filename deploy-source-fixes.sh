#!/bin/bash

# 部署源文件修复到主仓库
set -e

echo "🚀 部署源文件修复..."

# 添加源文件修复
git add js/melody-counter-system.js
git add static/js/melody-counter-system.js
git add functions/zpay-callback/index.js
git add static/tools/sight-reading-generator.html
git add tools/sight-reading-generator.html

# 提交源文件修复
git commit -m "修复试用系统：强制生产环境使用服务端验证

- 修复域名检测逻辑，GitHub Pages 强制服务端验证
- 防止用户刷新绕过试用限制
- zpay-callback 修复，保存到 codes 集合
- 试用限制 30→20 个旋律

🤖 Generated with [Claude Code](https://claude.ai/code)
Co-Authored-By: Claude <noreply@anthropic.com>"

# 推送源文件
git push origin main

echo "✅ 源文件已更新到GitHub"
echo "⚠️  现在需要手动部署到GitHub Pages..."