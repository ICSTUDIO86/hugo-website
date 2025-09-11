# 配置云函数HTTP访问 - 解决STATIC_RESOURCE_NONACTIVATED错误

## 🚨 问题诊断

**错误码**: `STATIC_RESOURCE_NONACTIVATED`  
**错误含义**: 虽然错误名字像是静态资源问题，但实际上是 **HTTP访问服务** 没有开启。

这是腾讯云CloudBase的一个常见误导性错误信息。要解决这个问题，需要：

## ✅ 解决方案：分三步配置

### 🔧 第一步：开启HTTP访问服务（必须！）

1. 登录腾讯云控制台：https://console.cloud.tencent.com/tcb
2. 选择环境：cloud1-4g1r5ho01a0cfd85
3. 在左侧菜单找到"**扩展能力**" → "**HTTP访问服务**"
4. 如果显示"未开启"，点击"**立即开启**"
5. 等待开启完成（通常1-2分钟）

### 🚀 第二步：配置HTTP触发器
1. 回到"云函数"页面，找到 `refundByAccessCode` 函数
2. 点击函数名进入详情页
3. 选择"触发器管理"标签
4. 点击"新建触发器"
5. 填写触发器配置：
   - **触发器类型**: HTTP
   - **触发路径**: /refundByAccessCode
   - **请求方法**: POST
   - **鉴权方式**: 匿名（重要！选择"匿名"以允许公开访问）
   - **启用响应集成**: 是
   - **启用CORS**: 是

6. 保存并获取URL：
   - 点击"确定"保存触发器
   - 复制生成的HTTP触发器URL
   - URL格式应该类似：
     ```
     https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/refundByAccessCode
     ```

### 🔍 第三步：验证配置
使用CLI测试：
```bash
cd /Users/igorchen/IC\ WEB\ 2/pehtheme-hugo/cloudbase-functions
tcb fn detail refundByAccessCode
```

应该看到"触发器"部分显示HTTP触发器信息。

## 前端代码确认
前端 `/static/js/refund-handler.js` 已正确配置URL：
```javascript
const response = await fetch('https://cloud1-4g1r5ho01a0cfd85-1377702774.ap-shanghai.app.tcloudbase.com/refundByAccessCode', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Request-Source': 'IC-Studio-RefundByAccessCode'
    },
    body: JSON.stringify({
        access_code: accessCode.toUpperCase(),
        reason: '用户主动退款',
        detail: detail
    })
});
```

## 重要提示
⚠️ **必须选择"匿名"鉴权方式**，否则前端无法访问云函数。

## 测试验证
配置完成后，在浏览器测试：
1. 打开开发者控制台 (F12)
2. 访问退款页面
3. 输入访问码提交
4. 应该看到成功响应，而不是401错误