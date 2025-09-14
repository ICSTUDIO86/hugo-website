#!/bin/bash

# HTTPS版本的部署脚本 - 修复订单号显示问题后的紧急部署
# 在public目录中运行: ./deploy-https.sh

set -e

# 配置
GITHUB_REPO="https://github.com/ICSTUDIO86/hugo-website.git"
BRANCH="main"
TEMP_DIR="/tmp/public-https-deploy-$(date +%s)"

echo "🚀 HTTPS部署到GitHub Pages (修复API端点问题)..."
echo "📂 当前目录文件数: $(find . -type f | wc -l)"

# 清理函数
cleanup() { [ -d "$TEMP_DIR" ] && rm -rf "$TEMP_DIR"; }
trap cleanup EXIT

# 1. 克隆仓库
echo "📥 克隆GitHub仓库 (HTTPS)..."
git clone "$GITHUB_REPO" "$TEMP_DIR" || { echo "❌ 克隆失败，请检查网络连接"; exit 1; }

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

git commit -m "修复支付成功弹窗订单号显示问题

🔧 关键修复:
- 统一API端点: checkOrderDetails → checkOrder
- 修复参数格式: access_code → code
- 适配数据结构: 与视奏工具使用相同API
- 订单号IC17578492893609188现在应能正确显示

Deploy: $(date '+%Y-%m-%d %H:%M:%S')

🤖 Generated with [Claude Code](https://claude.ai/code)"

echo "🔑 推送到GitHub (需要输入用户名和Personal Access Token)..."
echo "💡 如果没有PAT，请到 https://github.com/settings/tokens 创建"

git push origin "$BRANCH" || git push --force-with-lease origin "$BRANCH"

echo "✅ 部署成功！"
echo "🌐 访问: https://icstudio.club"
echo "📋 测试: 用户的订单号 IC17578492893609188 现在应该能正确显示"