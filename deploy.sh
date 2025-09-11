#!/bin/bash

# 快速部署当前public文件夹到GitHub Pages
# 在public目录中运行: ./deploy.sh

set -e

# 配置
GITHUB_REPO="git@github.com:ICSTUDIO86/hugo-website.git"
BRANCH="main"
TEMP_DIR="/tmp/public-quick-deploy-$(date +%s)"

echo "🚀 快速部署到GitHub Pages..."
echo "📂 当前目录文件数: $(find . -type f | wc -l)"

# 清理函数
cleanup() { [ -d "$TEMP_DIR" ] && rm -rf "$TEMP_DIR"; }
trap cleanup EXIT

# 1. 克隆仓库
echo "📥 克隆GitHub仓库..."
git clone "$GITHUB_REPO" "$TEMP_DIR" || { echo "❌ 克隆失败，请检查SSH密钥"; exit 1; }

cd "$TEMP_DIR"

# 2. 清空并复制
echo "🔄 更新内容..."
git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH"
find . -name ".git" -prune -o -type f -exec rm -f {} +
find . -name ".git" -prune -o -type d -empty -delete 2>/dev/null || true

# 3. 复制当前目录内容
cp -r "$OLDPWD"/* . 2>/dev/null || { echo "❌ 复制失败"; exit 1; }

# 复制隐藏文件
shopt -s dotglob
for file in "$OLDPWD"/.*; do
    [[ -f "$file" ]] && [[ "$(basename "$file")" != "." ]] && [[ "$(basename "$file")" != ".." ]] && cp "$file" . 2>/dev/null || true
done
shopt -u dotglob

# 4. 提交推送
echo "📤 提交并推送..."
git add .
git diff --cached --quiet && { echo "✅ 无变更，部署完成"; exit 0; }

git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')

🤖 Generated with [Claude Code](https://claude.ai/code)"

git push origin "$BRANCH" || git push --force-with-lease origin "$BRANCH"

echo "✅ 部署成功！"
echo "🌐 访问: https://icstudio.club"