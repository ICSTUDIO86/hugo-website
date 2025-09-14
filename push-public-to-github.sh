#!/bin/bash

# 专用于将public文件夹内容推送到GitHub的脚本
# 适用于静态网站部署到GitHub Pages

set -e  # 遇到错误就退出

echo "📁 开始将public文件夹部署到GitHub..."

# 配置变量
PROJECT_ROOT="/Users/igorchen/IC WEB/pehtheme-hugo"
PUBLIC_DIR="$PROJECT_ROOT/public"
GITHUB_REPO="git@github.com:ICSTUDIO86/hugo-website.git"
BRANCH="main"
TEMP_DIR="/tmp/public-deploy-$(date +%s)"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

# 函数：检查必要条件
check_prerequisites() {
    info "检查必要条件..."
    
    # 检查public目录是否存在
    if [ ! -d "$PUBLIC_DIR" ]; then
        error "public目录不存在: $PUBLIC_DIR"
        error "请先运行 hugo 命令构建网站"
        exit 1
    fi
    
    # 检查public目录是否为空
    if [ ! "$(ls -A "$PUBLIC_DIR")" ]; then
        error "public目录为空"
        error "请先运行 hugo 命令构建网站"
        exit 1
    fi
    
    # 检查index.html是否存在
    if [ ! -f "$PUBLIC_DIR/index.html" ]; then
        warning "public目录中没有找到index.html"
        warning "这可能不是一个有效的Hugo构建输出"
    fi
    
    success "必要条件检查通过"
}

# 函数：显示public目录内容摘要
show_public_summary() {
    info "public目录内容摘要:"
    echo "📍 路径: $PUBLIC_DIR"
    echo "📊 文件数量: $(find "$PUBLIC_DIR" -type f | wc -l)"
    echo "📂 目录数量: $(find "$PUBLIC_DIR" -type d | wc -l)"
    echo "📏 总大小: $(du -sh "$PUBLIC_DIR" | cut -f1)"
    echo ""
    echo "🔝 主要文件:"
    ls -la "$PUBLIC_DIR" | head -10
    echo ""
}

# 函数：清理函数
cleanup() {
    if [ -d "$TEMP_DIR" ]; then
        info "清理临时目录: $TEMP_DIR"
        rm -rf "$TEMP_DIR"
    fi
}

# 设置清理trap
trap cleanup EXIT

# 函数：执行部署
deploy_to_github() {
    info "开始部署流程..."
    
    # 1. 克隆或使用现有仓库
    info "准备GitHub仓库..."
    git clone "$GITHUB_REPO" "$TEMP_DIR" || {
        error "无法克隆GitHub仓库"
        error "请检查仓库URL和SSH密钥设置"
        exit 1
    }
    
    cd "$TEMP_DIR"
    
    # 2. 确保在正确分支
    git checkout "$BRANCH" || git checkout -b "$BRANCH"
    
    # 3. 清空现有内容（保留.git）
    info "清空仓库现有内容..."
    find . -name ".git" -prune -o -type f -exec rm {} +
    find . -name ".git" -prune -o -type d -empty -delete 2>/dev/null || true
    
    # 4. 复制public内容
    info "复制public目录内容..."
    cp -r "$PUBLIC_DIR"/* . 2>/dev/null || {
        error "复制public内容失败"
        exit 1
    }
    
    # 5. 复制隐藏文件（如果存在）
    if ls -A "$PUBLIC_DIR"/.* 2>/dev/null | grep -v "^\.$\|^\.\.$" > /dev/null; then
        cp -r "$PUBLIC_DIR"/.* . 2>/dev/null || true
    fi
    
    # 6. 检查复制结果
    if [ ! -f "index.html" ]; then
        error "部署失败：没有找到index.html"
        exit 1
    fi
    
    success "内容复制完成"
    
    # 7. Git操作
    info "提交到Git..."
    git add .
    
    # 检查是否有变更
    if git diff --cached --quiet; then
        info "没有发现变更，无需推送"
        return 0
    fi
    
    # 提交变更
    git commit -m "Deploy Hugo public folder - $(date '+%Y-%m-%d %H:%M:%S')

📦 Hugo构建输出部署
🗂️  包含文件: $(find . -name ".git" -prune -o -type f -print | wc -l) 个
📊 总大小: $(du -sh . | cut -f1)

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    
    # 8. 推送到GitHub
    info "推送到GitHub..."
    git push origin "$BRANCH" || {
        error "推送失败，可能需要强制推送"
        warning "尝试强制推送..."
        git push --force-with-lease origin "$BRANCH" || {
            error "强制推送也失败了"
            exit 1
        }
    }
    
    success "推送成功！"
}

# 主执行流程
main() {
    echo "🚀 Hugo Public文件夹 → GitHub 部署工具"
    echo "================================================="
    echo ""
    
    check_prerequisites
    show_public_summary
    
    # 确认部署
    echo "📋 部署配置:"
    echo "   源目录: $PUBLIC_DIR"
    echo "   目标仓库: $GITHUB_REPO"
    echo "   目标分支: $BRANCH"
    echo ""
    
    read -p "确认要部署吗? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warning "部署已取消"
        exit 0
    fi
    
    deploy_to_github
    
    echo ""
    echo "🎉 部署完成！"
    echo "📝 网站将在几分钟内更新"
    echo "🌐 您的网站: https://icstudio.club"
    echo "🔗 GitHub Pages: https://icstudio86.github.io/hugo-website/ (重定向到主域名)"
}

# 执行主函数
main "$@"