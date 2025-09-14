# 支付系统修复部署指南

## 问题修复总结

### 已修复的问题
1. ✅ 支付成功后安装包无法下载
2. ✅ 订单号无法正常显示
3. ✅ 订单数据未记录到codes集合
4. ✅ 访问码验证失败
5. ✅ 试用限制从30条改为20条
6. ✅ Command+R风格页面刷新

## 需要部署的文件

### 1. 云函数部署

#### zpay-callback云函数更新
```bash
# 部署路径：functions/zpay-callback/
# 主要更新：同时保存订单到codes集合，确保downloadInstaller能查询
cd functions/zpay-callback
npm install
# 使用CloudBase CLI部署
tcb fn deploy zpay-callback
```

#### 新增getOrderByNo云函数
```bash
# 部署路径：cloudbase-functions/functions/getOrderByNo/
# 功能：根据订单号获取订单信息
cd cloudbase-functions/functions/getOrderByNo
npm install
# 使用CloudBase CLI部署
tcb fn deploy getOrderByNo
```

### 2. 前端文件更新

#### sight-reading-tool/index.html
- 修复了支付回调处理逻辑
- 添加了handlePaymentCallback函数
- 改进了订单信息显示

#### js/melody-counter-system.js
- 试用限制从30条改为20条
- 更新了所有相关的计数逻辑

#### static/js/melody-counter-system.js
- 同步更新试用限制为20条

#### tools/sight-reading-generator.html
- 实现Command+R风格刷新
- 更新了试用限制注释

#### static/tools/sight-reading-generator.html
- 同步更新Command+R风格刷新
- 更新了试用限制注释

#### cloudbase-functions/functions/trialCounter/index.js
- 更新试用限制为20条

## 部署步骤

### 第一步：部署云函数
```bash
# 1. 登录CloudBase
tcb login

# 2. 部署zpay-callback更新
cd functions/zpay-callback
npm install
tcb fn deploy zpay-callback

# 3. 部署新的getOrderByNo云函数
cd ../../cloudbase-functions/functions/getOrderByNo
npm install
tcb fn deploy getOrderByNo

# 4. 部署trialCounter更新（如果需要）
cd ../trialCounter
tcb fn deploy trialCounter
```

### 第二步：更新前端文件
```bash
# 使用hugo构建并部署静态文件
hugo --gc --minify

# 或者直接上传更新的文件到服务器
# 需要更新的文件：
# - sight-reading-tool/index.html
# - js/melody-counter-system.js
# - static/js/melody-counter-system.js
# - tools/sight-reading-generator.html
# - static/tools/sight-reading-generator.html
```

### 第三步：配置云函数访问地址
确保getOrderByNo云函数可以通过HTTP访问：
```
https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/getOrderByNo
```

在CloudBase控制台：
1. 进入云函数管理
2. 找到getOrderByNo函数
3. 配置HTTP触发
4. 记录访问地址

## 验证步骤

### 1. 测试支付流程
1. 使用测试账号进行支付
2. 检查支付成功页面是否正确显示：
   - 访问码
   - 订单号
   - 支付金额
3. 验证安装包下载功能

### 2. 检查数据库
在CloudBase数据库控制台检查：
- `codes`集合是否有新订单记录
- `ic_studio_orders`集合是否有对应记录

### 3. 测试访问码验证
1. 使用生成的访问码验证激活
2. 尝试下载安装包
3. 检查是否能正常使用完整版功能

### 4. 验证试用限制
1. 清除浏览器缓存
2. 访问试用版页面
3. 确认试用限制为20条旋律

## 注意事项

1. **数据库权限**：确保云函数有读写codes和ic_studio_orders集合的权限
2. **CORS配置**：确保云函数已配置CORS头部允许跨域访问
3. **环境变量**：检查云函数环境变量是否正确配置：
   - `TCB_ENV`：CloudBase环境ID
   - `ZPAY_API_KEY`：Z-Pay API密钥

## 回滚方案

如果出现问题，可以回滚到之前的版本：
```bash
# 回滚云函数
tcb fn rollback zpay-callback --version [previous-version]

# 删除新增的云函数
tcb fn delete getOrderByNo

# 恢复前端文件到之前的版本
git checkout [previous-commit] -- sight-reading-tool/index.html
git checkout [previous-commit] -- js/melody-counter-system.js
# ... 其他文件类似
```

## 支持联系

如有问题，请联系：
- 邮箱：service@icstudio.club
- 技术支持：通过网站联系页面

---
更新日期：2025-01-14