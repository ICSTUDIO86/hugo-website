#!/bin/bash

# 30条旋律计数系统快速部署脚本
# 用于icstudio.club视奏工具

echo "🎵 IC Studio 30条旋律计数系统部署脚本"
echo "========================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否在正确的目录
if [ ! -f "cloudbase-functions/cloudbaserc.json" ]; then
    echo -e "${RED}错误：请在项目根目录运行此脚本${NC}"
    exit 1
fi

echo "📋 部署步骤："
echo ""

# 步骤1：复制JS文件到静态目录
echo -e "${YELLOW}1. 复制计数系统文件...${NC}"
cp js/melody-counter-system.js static/js/melody-counter-system.js 2>/dev/null || echo "  - static/js 已有文件"
cp js/melody-counter-system.js public/js/melody-counter-system.js 2>/dev/null || echo "  - public/js 已有文件"
echo -e "${GREEN}✅ 文件复制完成${NC}"
echo ""

# 步骤2：部署CloudBase函数
echo -e "${YELLOW}2. 部署CloudBase函数...${NC}"
cd cloudbase-functions

# 检查是否安装了cloudbase CLI
if ! command -v cloudbase &> /dev/null; then
    echo -e "${RED}未检测到cloudbase CLI，请先安装：${NC}"
    echo "npm install -g @cloudbase/cli"
    exit 1
fi

# 部署函数
echo "正在部署 trialCounter 函数..."
cloudbase functions:deploy trialCounter

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ CloudBase函数部署成功${NC}"
else
    echo -e "${RED}❌ CloudBase函数部署失败，请检查配置${NC}"
    exit 1
fi

cd ..
echo ""

# 步骤3：提示手动步骤
echo -e "${YELLOW}3. 请手动完成以下步骤：${NC}"
echo ""
echo "📝 在 CloudBase 控制台："
echo "   1. 创建集合 'device_melody_trials'"
echo "   2. 设置集合权限为：所有用户可读，仅管理员可写"
echo ""
echo "📝 在 tools/sight-reading-generator.html 文件中："
echo "   1. 在 </body> 标签前添加："
echo -e "${GREEN}      <script src=\"/js/melody-counter-system.js\"></script>${NC}"
echo ""
echo "   2. 删除或注释掉旧的试用系统："
echo -e "${RED}      <!-- <script src=\"/js/trial-limiter.js\"></script> -->${NC}"
echo ""
echo "   3. 搜索并删除所有调试函数："
echo "      - forceResetTrial()"
echo "      - resetTrialTime()"
echo "      - debugTrialStatus()"
echo "      - superActivate()"
echo "      - forceUnlock()"
echo ""

# 步骤4：验证
echo -e "${YELLOW}4. 验证部署：${NC}"
echo ""
echo "测试命令："
echo -e "${GREEN}curl -X POST \"https://cloud1-4g1r5ho01a0cfd85.service.tcloudbase.com/trialCounter\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{"
echo "    \"action\": \"check\","
echo "    \"deviceFingerprint\": \"test_device_123\","
echo "    \"userAgent\": \"Mozilla/5.0 Test\""
echo "  }'${NC}"
echo ""

echo "========================================"
echo -e "${GREEN}🎉 部署准备完成！${NC}"
echo ""
echo "重要提醒："
echo "1. 确保在 icstudio.club 上测试刷新无法绕过"
echo "2. 监控 CloudBase 函数日志确认正常工作"
echo "3. 用户将看到清晰的剩余次数显示"
echo ""
echo "如有问题，请查看 MELODY-COUNTER-DEPLOYMENT.md"