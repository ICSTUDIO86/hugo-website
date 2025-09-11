#!/bin/bash

# Hugo站点部署到GitHub Pages脚本
# 此脚本将Hugo生成的public目录内容部署到GitHub Pages

set -e  # 遇到错误就退出

echo "🚀 开始部署Hugo站点到GitHub Pages..."

# 项目根目录
PROJECT_ROOT="/Users/igorchen/IC WEB/pehtheme-hugo"
PUBLIC_DIR="$PROJECT_ROOT/public"
TEMP_REPO="/tmp/hugo-deploy-temp"

# 检查public目录是否存在
if [ ! -d "$PUBLIC_DIR" ]; then
    echo "❌ public目录不存在，请先运行 hugo 构建站点"
    exit 1
fi

# 检查public目录是否为空
if [ ! "$(ls -A $PUBLIC_DIR)" ]; then
    echo "❌ public目录为空，请先运行 hugo 构建站点"
    exit 1
fi

echo "📁 检查到public目录，包含以下文件："
ls -la "$PUBLIC_DIR" | head -10

# 清理临时目录
rm -rf "$TEMP_REPO"

# 克隆GitHub仓库到临时目录
echo "📥 克隆GitHub仓库..."
# 尝试SSH，如果失败则使用HTTPS
if ! git clone git@github.com:ICSTUDIO86/hugo-website.git "$TEMP_REPO" 2>/dev/null; then
    echo "ℹ️ SSH认证失败，尝试HTTPS..."
    git clone https://github.com/ICSTUDIO86/hugo-website.git "$TEMP_REPO"
fi

# 进入临时仓库目录
cd "$TEMP_REPO"

# 确保在主分支
git checkout main

# 清空仓库内容（保留.git目录）
echo "🧹 清空仓库内容..."
find . -name ".git" -prune -o -type f -exec rm {} \;
find . -name ".git" -prune -o -type d -empty -exec rmdir {} \; 2>/dev/null || true

# 复制public目录的内容到仓库根目录
echo "📋 复制public目录内容..."
cp -r "$PUBLIC_DIR"/* .

# 检查是否有关键文件
if [ ! -f "index.html" ]; then
    echo "❌ 部署失败：index.html文件缺失"
    exit 1
fi

echo "✅ 复制完成，仓库内容："
ls -la | head -10

# 添加所有文件
echo "📦 添加文件到git..."
git add .

# 检查是否有变更
if git diff --cached --quiet; then
    echo "📝 没有发现变更，无需部署"
    rm -rf "$TEMP_REPO"
    exit 0
fi

# 提交变更
echo "💾 提交变更..."
git commit -m "Deploy Hugo site - $(date '+%Y-%m-%d %H:%M:%S')

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 推送到GitHub
echo "🚀 推送到GitHub..."
git push origin main

# 清理临时目录
rm -rf "$TEMP_REPO"

echo "🎉 部署完成！"
echo "📝 网站将在几分钟内更新"
echo "🌐 访问: https://icstudio86.github.io/hugo-website/"
echo "🌐 或访问: https://icstudio.club"