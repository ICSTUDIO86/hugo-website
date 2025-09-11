# CloudBase 云函数部署指南

## 修复内容
已修复两个云函数中的JSON解析bug，确保能正确处理HTTP请求。

## 部署方式

### 方式一：使用CLI部署（推荐）

1. **登录CloudBase**
```bash
cd "/Users/igorchen/IC WEB 2/pehtheme-hugo/cloudbase"
tcb login
```
选择"腾讯云-API秘钥"方式登录

2. **部署云函数**
```bash
# 部署验证访问码函数
tcb fn deploy verify-access-code --force

# 部署生成访问码函数  
tcb fn deploy generate-access-code --force
```

### 方式二：手动在控制台部署

1. 登录腾讯云控制台：https://console.cloud.tencent.com/tcb
2. 选择环境：ic-studio-2gxpn7ha4836ae86
3. 进入"云函数"页面
4. 分别更新两个函数：

#### verify-access-code
- 点击函数名进入详情
- 点击"函数代码"标签
- 将 `/cloudbase/functions/verify-access-code/index.js` 的内容复制粘贴
- 点击"保存并安装依赖"
- 等待部署完成

#### generate-access-code
- 点击函数名进入详情
- 点击"函数代码"标签
- 将 `/cloudbase/functions/generate-access-code/index.js` 的内容复制粘贴
- 点击"保存并安装依赖"
- 等待部署完成

## 测试验证

部署完成后，在浏览器控制台测试：

```javascript
// 测试验证访问码
fetch('https://ic-studio-2gxpn7ha4836ae86.service.tcloudbase.com/verify-access-code', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Request-Source': 'IC-Studio-Test'
  },
  body: JSON.stringify({
    code: 'EJHIEOQKBVH',  // 使用实际的访问码
    deviceId: '7kvd7q',
    timestamp: Date.now()
  })
})
.then(res => res.json())
.then(data => console.log('验证结果:', data))
```

预期成功响应：
```json
{
  "success": true,
  "message": "访问码验证成功",
  "data": {
    "code": "EJHIEOQKBVH",
    "purchaseDate": "...",
    "features": ["sight-reading-tool"],
    "expiresAt": null
  }
}
```

## 注意事项
- 确保函数运行环境为 Nodejs16.13
- 内存配置为 256MB
- 超时时间为 5秒
- 已启用自动安装依赖