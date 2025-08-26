#!/bin/bash

# 切换到脚本所在目录（保证路径正确）
cd "$(dirname "$0")"

# 进入 public 文件夹
cd public

# 获取远端更新，避免冲突
git fetch origin

# 合并远端更新
git merge origin/main

# 添加所有更改
git add .

# 提交更改
git commit -m "Update Hugo public folder"

# 推送到 GitHub
git push origin main

# 显示状态
echo "Successfully updated public folder on GitHub!"
