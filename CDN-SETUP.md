# jsDelivr CDN 加速设置指南

## 概述

本系统通过 jsDelivr CDN 为 GitHub Pages 托管的静态网站提供加速服务，特别优化中国大陆用户的访问体验。

## 架构说明

- **主要托管**: GitHub Pages (icstudio.club)
- **CDN 加速**: jsDelivr (cdn.jsdelivr.net)
- **后端 API**: CloudBase 上海节点（保持不变）
- **回退机制**: 自动回退到 GitHub Pages

## CDN 配置

### GitHub 仓库信息
- **用户名**: ICSTUDIO86
- **仓库名**: hugo-website
- **分支**: main
- **CDN URL**: https://cdn.jsdelivr.net/gh/ICSTUDIO86/hugo-website@main

### 支持的资源类型
- ✅ CSS 文件 (压缩和指纹化)
- ✅ JavaScript 文件 (压缩和指纹化)
- ✅ 图片文件 (ICLOGO.png 等)
- ✅ 静态资源文件
- ✅ 字体文件
- ❌ HTML 文件 (继续由 GitHub Pages 提供)

## 启用 CDN

### 1. 配置文件设置 (config.toml)

```toml
[params.cdn]
  # 启用 CDN 加速
  enabled = true
  
  # GitHub 仓库信息
  github_user = "ICSTUDIO86"
  github_repo = "hugo-website"
  github_branch = "main"
  
  # CDN 基础 URL
  base_url = "https://cdn.jsdelivr.net/gh/ICSTUDIO86/hugo-website@main"
  
  # 启用健康检查
  health_check = true
  
  # 回退策略
  fallback_strategy = "local"
```

### 2. 环境控制

- **开发环境**: CDN 自动禁用，使用本地资源
- **生产环境**: CDN 自动启用，提供加速服务

## 自动回退机制

系统提供多层回退保护：

1. **CDN 失败检测**: 自动检测 jsDelivr 加载失败
2. **本地回退**: 失败时自动加载 GitHub Pages 资源
3. **完整性检查**: 使用 SRI (Subresource Integrity) 确保安全

## 使用方法

### 1. 自动加速
所有模板中的静态资源将自动使用 CDN：
- CSS: `layouts/partials/head/css.html`
- JS: `layouts/partials/footer/js.html`
- 图标: `layouts/partials/head/favicon.html`

### 2. 手动调用
JavaScript 中可使用全局函数：

```javascript
// 获取 CDN 路径
const cdnUrl = window.getStaticUrl('/images/example.png');

// 检查 CDN 可用性
window.checkCDN(function(available) {
    if (available) {
        console.log('CDN 可用');
    } else {
        console.log('CDN 不可用，使用本地资源');
    }
});
```

### 3. 动态资源
系统自动监听页面中动态添加的图片元素，自动应用 CDN 加速。

## 性能监控

### 开发环境调试
在浏览器控制台中查看调试信息：
```
🚀 CDN 静态资源加速已启用: https://cdn.jsdelivr.net/gh/ICSTUDIO86/hugo-website@main
✅ 图片 CDN 加载成功: /images/example.png -> https://cdn.jsdelivr.net/...
❌ 图片 CDN 加载失败，保持原路径: /images/missing.png
```

### 性能指标
- **缓存时间**: jsDelivr 全球 CDN 节点缓存
- **压缩**: 自动 Gzip/Brotli 压缩
- **HTTP/2**: 支持多路复用
- **全球节点**: 覆盖中国大陆的多个节点

## 部署流程

### 1. Hugo 构建
```bash
# 生产环境构建
hugo --environment production --minify

# 部署到 GitHub Pages
git add .
git commit -m "Update with CDN support"
git push origin main
```

### 2. CDN 缓存更新
jsDelivr 会自动从 GitHub 同步最新内容，通常需要几分钟时间。

### 3. 手动刷新 CDN (可选)
访问以下 URL 强制刷新 jsDelivr 缓存：
```
https://purge.jsdelivr.net/gh/ICSTUDIO86/hugo-website@main/
```

## 故障排除

### 1. CDN 加载失败
- **检查**: 浏览器控制台是否有错误信息
- **解决**: 系统会自动回退到本地资源
- **预防**: 确保 GitHub 仓库公开且文件存在

### 2. 缓存问题
- **现象**: 更新后的文件未生效
- **解决**: 等待 jsDelivr 自动同步（通常 10 分钟内）
- **手动**: 使用 purge.jsdelivr.net 强制刷新

### 3. 开发环境测试
```bash
# 测试生产环境配置
hugo server --environment production
```

## 监控和维护

### 1. 定期检查
- 监控 CDN 可用性
- 检查加载时间改善情况
- 观察中国大陆用户反馈

### 2. 配置调整
根据使用情况调整 `config.toml` 中的 CDN 设置。

### 3. 版本管理
jsDelivr 支持版本固定，如需要可以指定特定 commit：
```
https://cdn.jsdelivr.net/gh/ICSTUDIO86/hugo-website@commit_hash/
```

## 注意事项

1. **安全性**: 使用 SRI 确保资源完整性
2. **兼容性**: 完全向后兼容，不影响现有功能
3. **性能**: 中国大陆用户访问速度显著提升
4. **成本**: jsDelivr 完全免费
5. **可靠性**: 99.9% 可用性，自动回退保障

## 技术细节

### 文件结构
```
layouts/partials/
├── cdn-config.html              # CDN 基础配置
├── cdn-static-resources.html    # 动态资源处理
├── head/css.html               # CSS CDN 支持
├── head/favicon.html           # 图标 CDN 支持
└── footer/js.html              # JS CDN 支持
```

### 关键特性
- 环境感知（开发/生产）
- 自动回退机制
- 完整性验证
- 动态资源监听
- 性能监控日志

通过这套 CDN 系统，您的网站将为中国大陆用户提供更快的加载速度，同时保持完整的回退保障。