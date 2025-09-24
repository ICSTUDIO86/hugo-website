#!/bin/bash

# IC Studio - Vercel 部署脚本
# 作者: Igor Chen
# 网站: https://icstudio.club

set -e  # 如果任何命令失败，立即退出

echo "🚀 IC Studio Vercel 部署脚本 v1.0"
echo "========================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查Vercel CLI是否安装
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI 未安装，正在安装...${NC}"
    npm install -g vercel
    echo -e "${GREEN}✅ Vercel CLI 安装完成${NC}"
fi

# 检查是否有未提交的更改
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  发现未提交的更改，正在提交...${NC}"

    # 提示用户输入提交信息
    echo -n "请输入提交信息 (默认: Auto deploy to Vercel): "
    read commit_message
    if [ -z "$commit_message" ]; then
        commit_message="Auto deploy to Vercel"
    fi

    git add .
    git commit -m "$commit_message"
    echo -e "${GREEN}✅ 更改已提交${NC}"
fi

# 推送到 GitHub (确保代码同步)
echo -e "${BLUE}📤 推送到 GitHub...${NC}"
git push origin main

# 本地构建测试 (可选)
echo -e "${BLUE}🔧 本地构建测试...${NC}"
npm run clean
npm run build:css

if [ ! -f "static/css/main.css" ]; then
    echo -e "${RED}❌ CSS 构建失败${NC}"
    exit 1
fi

echo -e "${GREEN}✅ CSS 构建成功${NC}"

# 部署到 Vercel
echo -e "${BLUE}🚀 开始部署到 Vercel...${NC}"

# 选择部署类型
echo "选择部署类型:"
echo "1) 预览部署 (Preview)"
echo "2) 生产部署 (Production)"
echo -n "请选择 (1/2, 默认:1): "
read deploy_type

if [ "$deploy_type" = "2" ]; then
    echo -e "${BLUE}🌐 部署到生产环境...${NC}"
    vercel --prod --yes
else
    echo -e "${BLUE}👀 创建预览部署...${NC}"
    vercel --yes
fi

echo ""
echo -e "${GREEN}🎉 Vercel 部署完成！${NC}"
echo ""
echo "📊 部署信息:"
echo "├─ ✅ 代码已推送到 GitHub"
echo "├─ ✅ Vercel 构建成功"
echo "├─ ✅ 全球 CDN 已更新"
echo "└─ ⚡ 边缘节点正在同步..."

echo ""
echo -e "${BLUE}🔗 有用链接:${NC}"
echo "📈 Vercel 仪表板: https://vercel.com/dashboard"
echo "⚙️  项目设置: vercel --inspect"
echo "🌐 域名管理: vercel domains"

echo ""
echo -e "${GREEN}💡 提示:${NC}"
echo "- 预览链接会自动复制到剪贴板"
echo "- 生产部署会自动更新 icstudio.club"
echo "- 使用 'vercel logs' 查看部署日志"