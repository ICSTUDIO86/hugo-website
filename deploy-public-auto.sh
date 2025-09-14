#!/bin/bash

# 自动部署public文件夹到GitHub Pages
# 使用方法: ./deploy-public-auto.sh

set -e  # 遇到错误就退出

# 配置
PROJECT_ROOT="/Users/igorchen/IC WEB/pehtheme-hugo"
PUBLIC_DIR="$PROJECT_ROOT/public"
GITHUB_REPO="git@github.com:ICSTUDIO86/hugo-website.git"
BRANCH="main"
TEMP_DIR="/tmp/public-auto-deploy-$(date +%s)"

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${BLUE}📁 $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; exit 1; }

# 清理函数
cleanup() {
    if [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
        info "清理临时目录完成"
    fi
}
trap cleanup EXIT

# 检查public目录
if [ ! -d "$PUBLIC_DIR" ]; then
    error "public目录不存在: $PUBLIC_DIR"
fi

if [ ! "$(ls -A $PUBLIC_DIR)" ]; then
    error "public目录为空，请先运行 hugo 命令构建网站"
fi

info "开始部署public文件夹到GitHub..."
echo "📊 源目录: $PUBLIC_DIR"
echo "🎯 目标仓库: https://github.com/ICSTUDIO86/hugo-website"
echo "📂 文件数量: $(find $PUBLIC_DIR -type f | wc -l)"
echo ""

# 1. 克隆仓库
info "克隆GitHub仓库..."
git clone "$GITHUB_REPO" "$TEMP_DIR" || error "无法克隆GitHub仓库，请检查SSH密钥"

cd "$TEMP_DIR"

# 2. 切换到目标分支
git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH"

# 3. 清空现有内容（保留.git）
info "清空仓库现有内容..."
find . -name ".git" -prune -o -type f -exec rm -f {} +
find . -name ".git" -prune -o -type d -empty -delete 2>/dev/null || true

# 4. 复制public内容
info "复制public目录内容..."
cp -r "$PUBLIC_DIR"/* . 2>/dev/null || error "复制文件失败"

# 复制隐藏文件（如果有）
shopt -s dotglob
for file in "$PUBLIC_DIR"/.*; do
    if [[ -f "$file" ]] && [[ "$(basename "$file")" != "." ]] && [[ "$(basename "$file")" != ".." ]]; then
        cp "$file" . 2>/dev/null || true
    fi
done
shopt -u dotglob

# 5. 检查关键文件
if [ ! -f "index.html" ]; then
    error "部署失败：没有找到index.html"
fi

success "文件复制完成"

# 6. Git提交
info "提交更改..."
git add .

# 检查是否有变更
if git diff --cached --quiet; then
    success "没有发现变更，部署完成"
    exit 0
fi

# 生成提交信息
COMMIT_MSG="Deploy: $(date '+%Y-%m-%d %H:%M:%S')

📦 自动部署Hugo public文件夹
🗂️  文件数: $(find . -name ".git" -prune -o -type f -print | wc -l) 个
📊 总大小: $(du -sh . | cut -f1)
🌐 网站: https://icstudio.club

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git commit -m "$COMMIT_MSG"

# 7. 推送到GitHub
info "推送到GitHub..."
git push origin "$BRANCH" || {
    info "常规推送失败，尝试强制推送..."
    git push --force-with-lease origin "$BRANCH" || error "推送失败"
}

success "部署成功！"
echo ""
echo "🎉 网站已更新！"
echo "🌐 访问: https://icstudio.club"
echo "🔗 GitHub: https://github.com/ICSTUDIO86/hugo-website"
echo ""