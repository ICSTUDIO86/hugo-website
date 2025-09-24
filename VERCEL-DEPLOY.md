# 🚀 IC Studio Vercel 迁移指南

## 📋 迁移步骤总览

### 第一步：安装 Vercel CLI ⏱️ 2分钟
```bash
# 全局安装 Vercel CLI
npm install -g vercel

# 登录 Vercel 账户
vercel login
```

### 第二步：项目配置 ⏱️ 3分钟

已创建的配置文件：
- ✅ `vercel.json` - Vercel 项目配置
- ✅ `deploy-vercel.sh` - 自动化部署脚本
- ✅ 优化的 `package.json` 构建脚本

### 第三步：初次部署 ⏱️ 5分钟

```bash
# 进入项目目录
cd /Users/igorchen/IC\ WEB/pehtheme-hugo

# 执行部署脚本
./deploy-vercel.sh

# 或手动部署
vercel
```

### 第四步：域名配置 ⏱️ 5分钟

```bash
# 添加自定义域名
vercel domains add icstudio.club

# 查看域名设置说明
vercel domains ls
```

## ⚙️ 配置详情

### 已优化的构建配置

```json
// vercel.json 关键配置
{
  "buildCommand": "npm run build:css && hugo --gc --minify --cleanDestinationDir --baseURL https://icstudio.club",
  "outputDirectory": "public",
  "headers": [
    // 缓存优化配置
    // 安全头配置
  ]
}
```

### 新增的 npm 脚本

```json
{
  "vercel-build": "npm run build:css && hugo --gc --minify --cleanDestinationDir",
  "preview": "hugo server --disableFastRender --navigateToChanged",
  "clean": "rm -rf public resources .hugo_build.lock"
}
```

## 🌐 域名 DNS 配置

### 在你的域名提供商（如 Cloudflare）设置：

```dns
类型: CNAME
名称: @
目标: cname.vercel-dns.com

类型: CNAME
名称: www
目标: cname.vercel-dns.com
```

## 🔄 部署流程对比

| 步骤 | GitHub Pages | Vercel |
|------|-------------|---------|
| 代码推送 | `git push` | `git push` |
| 触发构建 | GitHub Actions | 自动检测 |
| 构建时间 | 3-5分钟 | 1-2分钟 |
| 部署完成 | 5-8分钟 | 2-3分钟 |
| 全球同步 | 10-15分钟 | 30秒-2分钟 |

## 🚨 注意事项

### 保持不变的部分
- ✅ CloudBase 后端服务 - 无需修改
- ✅ 支付系统集成 - 继续工作
- ✅ Umami 分析追踪 - 正常运行
- ✅ 所有自定义 JS/CSS - 无需更改

### 需要验证的功能
- 🔍 支付回调 URL （如果有硬编码域名）
- 🔍 API 接口调用（检查 CORS 设置）
- 🔍 第三方服务集成

## 🛠️ 常用命令

```bash
# 查看项目状态
vercel

# 预览部署
vercel --dev

# 生产部署
vercel --prod

# 查看部署日志
vercel logs

# 域名管理
vercel domains

# 环境变量设置
vercel env add

# 项目设置
vercel --inspect
```

## 📊 性能优化

### Vercel 自动优化功能
- ✅ **图片优化**: 自动压缩和格式转换
- ✅ **代码分割**: 按需加载优化
- ✅ **Gzip/Brotli**: 自动压缩
- ✅ **HTTP/3**: 现代协议支持
- ✅ **边缘缓存**: 全球 CDN 缓存

### 手动性能调优
```bash
# 分析构建大小
vercel --debug

# 检查缓存策略
curl -I https://icstudio.club

# 性能测试
npm run preview
```

## 🔧 故障排除

### 常见问题

**问题**: 构建失败 "Hugo not found"
```bash
# 解决方案: 检查 Hugo 版本
vercel env add HUGO_VERSION 0.121.0
```

**问题**: CSS 文件缺失
```bash
# 解决方案: 确保构建命令正确
npm run clean && npm run build:css
```

**问题**: 域名解析失败
```bash
# 解决方案: 检查 DNS 设置
nslookup icstudio.club
vercel domains inspect icstudio.club
```

## 📞 支持

如遇问题：
1. 查看 Vercel 仪表板错误日志
2. 运行 `vercel logs` 获取详细信息
3. 检查 GitHub 代码是否正确推送

## 🎯 迁移完成检查清单

- [ ] Vercel CLI 已安装并登录
- [ ] 项目已成功部署到 Vercel
- [ ] 自定义域名 icstudio.club 已配置
- [ ] DNS 记录已正确设置
- [ ] 所有页面可正常访问
- [ ] 支付功能正常工作
- [ ] Umami 分析数据正常
- [ ] CloudBase 接口调用正常
- [ ] 性能测试通过（中国用户 < 3秒）

---

**预计总迁移时间**: 15-20 分钟
**回滚方案**: 随时可切换回 GitHub Pages