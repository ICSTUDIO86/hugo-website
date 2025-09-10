#!/bin/bash
set -euo pipefail

# === 可改参数 ===
PROJECT_DIR="/Users/igorchen/IC WEB 2/pehtheme-hugo"
PUBLIC_SUBDIR="public"
REMOTE="origin"
BRANCH="main"
BUILD=true   # 若需先生成静态文件设为 true

# === 执行 ===
cd "$PROJECT_DIR"

if [ "$BUILD" = true ]; then
  command -v hugo >/dev/null 2>&1 && hugo -D
fi

git fetch "$REMOTE"
git merge "$REMOTE/$BRANCH" || true

# 强制添加被忽略的 public 文件
git add -f "$PUBLIC_SUBDIR"/** "$PUBLIC_SUBDIR" 2>/dev/null || git add -f "$PUBLIC_SUBDIR"

git commit -m "Update public $(date +'%Y-%m-%d %H:%M:%S')" || echo "ℹ️ 无变更可提交"
git push "$REMOTE" "$BRANCH"

echo "✅ 已强制提交并推送 $PUBLIC_SUBDIR 到 $REMOTE/$BRANCH"