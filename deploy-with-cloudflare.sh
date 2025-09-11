#!/bin/bash

# IC Studio - 增强版部署脚本 (支持 Cloudflare CDN 缓存自动清除)
# 作者: Igor Chen
# 网站: https://icstudio.club

set -e  # 如果任何命令失败，立即退出

echo "🚀 IC Studio 部署脚本 v2.0 (with Cloudflare CDN)"
echo "================================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查是否有未提交的更改
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  发现未提交的更改，正在提交...${NC}"
    
    # 提示用户输入提交信息
    echo -n "请输入提交信息 (默认: Auto update): "
    read commit_message
    if [ -z "$commit_message" ]; then
        commit_message="Auto update"
    fi
    
    git add .
    git commit -m "$commit_message"
    echo -e "${GREEN}✅ 更改已提交${NC}"
fi

# 推送到 GitHub
echo -e "${BLUE}📤 推送到 GitHub...${NC}"
git push origin main

# 等待 GitHub Actions 完成
echo -e "${YELLOW}⏳ 等待 GitHub Actions 自动部署...${NC}"
echo "   - Hugo 构建"
echo "   - GitHub Pages 部署"
echo "   - Cloudflare 缓存清除"

# 检查是否设置了 Cloudflare API (可选的手动清除)
if [ -n "$CLOUDFLARE_ZONE_ID" ] && [ -n "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${BLUE}⚡ 手动清除 Cloudflare 缓存...${NC}"
    
    curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
         -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
         -H "Content-Type: application/json" \
         --data '{"purge_everything":true}' \
         --silent > /dev/null
    
    echo -e "${GREEN}✅ Cloudflare 缓存已手动清除${NC}"
else
    echo -e "${YELLOW}💡 提示: 可以设置环境变量启用手动缓存清除${NC}"
    echo "   export CLOUDFLARE_ZONE_ID='your_zone_id'"
    echo "   export CLOUDFLARE_API_TOKEN='your_api_token'"
fi

echo ""
echo -e "${GREEN}🎉 部署完成！${NC}"
echo -e "${GREEN}📝 网站更新将在 1-5 分钟内生效${NC}"
echo -e "${GREEN}🌐 访问: https://icstudio.club${NC}"

echo ""
echo "📊 部署状态:"
echo "├─ ✅ 代码已推送到 GitHub"
echo "├─ 🔄 GitHub Actions 自动构建中..."
echo "├─ 🔄 自动部署到 GitHub Pages..."
echo "└─ ⚡ Cloudflare CDN 缓存自动清除..."

echo ""
echo -e "${BLUE}🔗 有用链接:${NC}"
echo "📈 GitHub Actions: https://github.com/您的用户名/仓库名/actions"
echo "⚙️  Cloudflare 仪表板: https://dash.cloudflare.com"
echo "🌐 网站状态: https://icstudio.club"