#!/bin/bash

# 简化的Hugo部署脚本
# 使用GitHub Actions自动部署，无需手动推送

set -e

echo "🚀 简化的Hugo网站部署..."

# 项目根目录
PROJECT_ROOT="/Users/igorchen/IC WEB/pehtheme-hugo"
cd "$PROJECT_ROOT"

# 检查是否在正确的git仓库中
if [ ! -d ".git" ]; then
    echo "❌ 当前目录不是git仓库"
    exit 1
fi

# 构建Hugo网站
echo "🏗️ 构建Hugo网站..."
hugo --minify

# 检查public目录
if [ ! -f "public/index.html" ]; then
    echo "❌ 构建失败：public/index.html不存在"
    exit 1
fi

echo "✅ Hugo网站构建完成"

# 添加所有更改到git
echo "📦 添加文件到git..."
git add .

# 检查是否有更改
if git diff --cached --quiet; then
    echo "📝 没有发现更改"
    exit 0
fi

# 提交更改
echo "💾 提交更改..."
git commit -m "更新Hugo网站内容 - $(date '+%Y-%m-%d %H:%M:%S')

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 推送到GitHub
echo "🚀 推送到GitHub..."
git push origin main

echo "🎉 部署完成！"
echo "📝 GitHub Actions将自动部署到GitHub Pages"
echo "⏳ 请等待2-3分钟让CI/CD完成部署"
echo "🌐 访问: https://icstudio86.github.io/hugo-website/"
echo "🌐 或访问: https://icstudio.club"