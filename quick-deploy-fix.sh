#!/bin/bash

# 快速修复部署脚本 - 只部署试用系统修复
# 这个脚本会创建一个最小的提交并推送到GitHub Pages

set -e

echo "🚀 开始快速修复部署..."

# 检查是否在正确目录
if [ ! -d "public" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 添加关键的修复文件
echo "📁 添加修复文件到Git..."

# 添加关键的试用系统修复文件
git add js/melody-counter-system.js
git add static/js/melody-counter-system.js
git add public/js/melody-counter-system.js

# 添加其他必要的修复文件
git add functions/zpay-callback/index.js
git add cloudbase-functions/functions/zpay-callback/
git add public/tools/sight-reading-generator.html
git add static/tools/sight-reading-generator.html
git add tools/sight-reading-generator.html

# 提交修复
echo "💾 创建提交..."
git commit -m "修复试用系统：强制生产环境使用服务端验证

- 修复 melody-counter-system.js 域名检测逻辑
- GitHub Pages 和所有生产域名现在强制使用服务端试用验证
- 防止用户通过刷新绕过试用限制
- 更新 zpay-callback 保存到 codes 集合
- 试用限制从 30 改为 20 个旋律

🌐 影响的域名:
- icstudio.club (主域名)
- icstudio86.github.io (GitHub Pages)
- 所有 .io, .com, .net, .org 等生产域名

🛡️ 安全性提升:
- 服务端设备指纹追踪
- 无法通过清除浏览器数据重置
- CloudBase 数据库持久化存储

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>" || {
    echo "⚠️  没有需要提交的更改，或提交失败"
}

# 推送到远程
echo "🚀 推送到GitHub..."
if git push origin main; then
    echo "✅ 部署成功！"
    echo "🌐 您的修复将在几分钟内生效"
    echo "📱 现在试用系统会在所有生产环境使用服务端验证"
else
    echo "❌ 推送失败"
    echo "💡 可能的解决方案："
    echo "   1. 检查SSH密钥配置"
    echo "   2. 或手动将 public/ 文件夹内容复制到GitHub仓库"
    exit 1
fi

echo ""
echo "🎉 快速修复部署完成！"
echo "🔒 现在用户无法通过刷新绕过试用限制了"