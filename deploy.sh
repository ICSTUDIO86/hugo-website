#!/bin/bash

# IC Studio 视奏工具 - 一键部署脚本
echo "🚀 开始部署 IC Studio 视奏工具..."

# 检查必要的工具
check_requirements() {
    echo "📋 检查部署要求..."
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ 需要安装 Node.js"
        exit 1
    fi
    
    # 检查 Hugo
    if ! command -v hugo &> /dev/null; then
        echo "❌ 需要安装 Hugo"
        exit 1
    fi
    
    # 检查 Cloudbase CLI
    if ! command -v tcb &> /dev/null; then
        echo "⚠️  Cloudbase CLI 未安装，正在安装..."
        npm install -g @cloudbase/cli
    fi
    
    echo "✅ 环境检查完成"
}

# 构建网站
build_website() {
    echo "🔨 构建 Hugo 网站..."
    
    # 清理旧的构建文件
    rm -rf public/
    
    # 构建网站
    hugo --minify --gc
    
    if [ $? -eq 0 ]; then
        echo "✅ 网站构建完成"
    else
        echo "❌ 网站构建失败"
        exit 1
    fi
}

# 部署云函数
deploy_functions() {
    echo "☁️  部署 Cloudbase 云函数..."
    
    # 检查是否已登录
    if ! tcb auth list &> /dev/null; then
        echo "🔐 请先登录 Cloudbase："
        tcb login
    fi
    
    # 部署云函数
    cd functions
    
    # 部署支付回调函数
    echo "📦 部署 zpay-callback 函数..."
    cd zpay-callback && npm install && cd ..
    tcb functions:deploy zpay-callback
    
    # 部署访问码生成函数  
    echo "📦 部署 generate-access-code 函数..."
    cd generate-access-code && npm install && cd ..
    tcb functions:deploy generate-access-code
    
    cd ..
    
    echo "✅ 云函数部署完成"
}

# 部署静态网站
deploy_website() {
    echo "🌐 部署静态网站到 Cloudbase 托管..."
    
    # 部署到静态网站托管
    tcb hosting:deploy public
    
    if [ $? -eq 0 ]; then
        echo "✅ 网站部署完成"
    else
        echo "❌ 网站部署失败"
        exit 1
    fi
}

# 配置数据库
setup_database() {
    echo "🗄️  配置数据库集合..."
    
    # 创建必要的数据库集合
    tcb db:createCollection ic_studio_orders
    tcb db:createCollection access_logs
    
    echo "✅ 数据库配置完成"
}

# 显示部署结果
show_results() {
    echo ""
    echo "🎉 部署完成！"
    echo ""
    echo "📋 部署信息："
    echo "   🌐 网站地址: https://your-env-id.tcloudbaseapp.com"
    echo "   ☁️  云函数: zpay-callback, generate-access-code" 
    echo "   🗄️  数据库: ic_studio_orders, access_logs"
    echo ""
    echo "📝 接下来需要："
    echo "   1. 在 Cloudbase 控制台配置环境变量"
    echo "   2. 在 Z-pay 后台配置回调地址"
    echo "   3. 更新前端配置文件中的实际参数"
    echo ""
    echo "📖 详细配置请参考 CLOUDBASE-SETUP.md"
}

# 主函数
main() {
    check_requirements
    build_website
    deploy_functions  
    deploy_website
    setup_database
    show_results
}

# 运行部署
main