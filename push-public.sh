#!/bin/bash

# 简单的public推送脚本
# 使用方法: ./push-public.sh

cd "/Users/igorchen/IC WEB/pehtheme-hugo"

echo "🚀 开始部署public文件夹..."

# 检查public目录
if [ ! -d "public" ]; then
    echo "❌ 找不到public目录"
    exit 1
fi

if [ ! "$(ls -A public)" ]; then
    echo "❌ public目录为空，请先运行 hugo 命令"
    exit 1
fi

# 运行部署脚本
./deploy-public-auto.sh

echo "✅ 部署完成！"