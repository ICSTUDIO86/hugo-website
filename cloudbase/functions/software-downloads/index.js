/**
 * 软件下载管理系统
 * 支持：验证许可证后提供软件下载链接
 * 
 * API 端点：
 * - /api/software/download - 获取下载链接（需验证许可证）
 * - /api/software/list - 获取可用软件列表
 */

const cloud = require('@cloudbase/node-sdk')

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
})

const db = app.database()
const licensesCollection = db.collection('licenses')
const downloadsCollection = db.collection('software_downloads')
const accessLogsCollection = db.collection('unified_access_logs')

// 软件下载配置
const SOFTWARE_PACKAGES = {
  'macos-arm64': {
    name: 'IC Studio 视奏工具 (macOS Apple Silicon)',
    fileName: 'IC Studio 视奏工具-1.0.0-mac-arm64.zip',
    platform: 'macOS',
    arch: 'arm64',
    size: '88.7 MB',
    url: 'https://cloud1-4g1r5ho01a0cfd85.ap-shanghai.app.tcloudbase.com/downloads/IC Studio 视奏工具-1.0.0-mac-arm64.zip',
    requirements: 'macOS 11.0 或更高版本 (M1/M2/M3 Mac)',
    icon: '🍎'
  },
  'macos-x64-dmg': {
    name: 'IC Studio 视奏工具 (macOS Intel DMG)',
    fileName: 'IC Studio 视奏工具-1.0.0-mac-x64.dmg',
    platform: 'macOS',
    arch: 'x64',
    size: '88.3 MB',
    url: 'https://cloud1-4g1r5ho01a0cfd85.ap-shanghai.app.tcloudbase.com/downloads/IC Studio 视奏工具-1.0.0-mac-x64.dmg',
    requirements: 'macOS 10.15 或更高版本 (Intel Mac)',
    icon: '🍎'
  },
  'macos-x64-zip': {
    name: 'IC Studio 视奏工具 (macOS Intel ZIP)',
    fileName: 'IC Studio 视奏工具-1.0.0-mac-x64.zip',
    platform: 'macOS',
    arch: 'x64',
    size: '93.4 MB',
    url: 'https://cloud1-4g1r5ho01a0cfd85.ap-shanghai.app.tcloudbase.com/downloads/IC Studio 视奏工具-1.0.0-mac-x64.zip',
    requirements: 'macOS 10.15 或更高版本 (Intel Mac)',
    icon: '🍎'
  },
  'windows-x64': {
    name: 'IC Studio 视奏工具 (Windows 64位)',
    fileName: 'IC Studio 视奏工具-1.0.0-win-x64.exe',
    platform: 'Windows',
    arch: 'x64',
    size: '74.9 MB',
    url: 'https://cloud1-4g1r5ho01a0cfd85.ap-shanghai.app.tcloudbase.com/downloads/IC Studio 视奏工具-1.0.0-win-x64.exe',
    requirements: 'Windows 10 或更高版本 (64位)',
    icon: '🪟'
  },
  'windows-x86': {
    name: 'IC Studio 视奏工具 (Windows 通用版)',
    fileName: 'IC Studio 视奏工具-1.0.0-win.exe',
    platform: 'Windows',
    arch: 'x86',
    size: '144.3 MB',
    url: 'https://cloud1-4g1r5ho01a0cfd85.ap-shanghai.app.tcloudbase.com/downloads/IC Studio 视奏工具-1.0.0-win.exe',
    requirements: 'Windows 10 或更高版本 (通用安装包)',
    icon: '🪟'
  },
  'linux-x64-appimage': {
    name: 'IC Studio 视奏工具 (Linux AppImage)',
    fileName: 'IC Studio 视奏工具-1.0.0-linux-x86_64.AppImage',
    platform: 'Linux',
    arch: 'x64',
    size: '79.4 MB',
    url: 'https://cloud1-4g1r5ho01a0cfd85.ap-shanghai.app.tcloudbase.com/downloads/IC Studio 视奏工具-1.0.0-linux-x86_64.AppImage',
    requirements: 'Ubuntu 18.04+ 或其他现代 Linux 发行版',
    icon: '🐧'
  },
  'linux-x64-deb': {
    name: 'IC Studio 视奏工具 (Linux DEB)',
    fileName: 'IC Studio 视奏工具-1.0.0-linux-amd64.deb',
    platform: 'Linux',
    arch: 'x64',
    size: '71.9 MB',
    url: 'https://cloud1-4g1r5ho01a0cfd85.ap-shanghai.app.tcloudbase.com/downloads/IC Studio 视奏工具-1.0.0-linux-amd64.deb',
    requirements: 'Debian/Ubuntu 系统',
    icon: '🐧'
  }
}

// 记录下载日志
async function logDownload(action, result, details) {
  try {
    await accessLogsCollection.add({
      logId: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      action: `SOFTWARE_${action.toUpperCase()}`,
      result: result,
      
      licenseId: details.licenseId || null,
      licenseKey: details.licenseKey || null,
      orderId: details.orderId || null,
      deviceId: details.deviceId || null,
      
      clientIp: details.clientIp || 'unknown',
      userAgent: details.userAgent || 'unknown',
      platform: details.platform || 'unknown',
      
      details: details.details || {},
      
      timestamp: new Date(),
      createdAt: new Date()
    })
  } catch (error) {
    console.log('⚠️ 下载日志记录失败:', error.message)
  }
}

exports.main = async (event, context) => {
  try {
    // 解析请求数据
    let data = event
    if (event.body) {
      try {
        data = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
      } catch (e) {
        throw new Error('无效的请求数据格式')
      }
    }
    
    const action = data.action || 'list' // download | list
    const clientIp = event.clientIP || context.clientIP || 'unknown'
    const userAgent = event.headers?.['user-agent'] || 'unknown'
    
    console.log(`🚀 软件下载请求: ${action}`)
    
    // 根据动作执行不同的操作
    switch (action) {
      
      case 'download':
        return await getDownloadLink(data, clientIp, userAgent)
        
      case 'list':
        return await getSoftwareList(data, clientIp, userAgent)
        
      default:
        throw new Error(`未知的操作类型: ${action}`)
    }
    
  } catch (error) {
    console.error('❌ 软件下载操作失败:', error)
    
    // 记录错误日志
    try {
      await db.collection('error-logs').add({
        function: 'software-downloads',
        error: error.message,
        stack: error.stack,
        event: event,
        timestamp: new Date()
      })
    } catch (logError) {
      console.error('❌ 错误日志记录失败:', logError)
    }
    
    return {
      success: false,
      message: error.message || '软件下载操作失败'
    }
  }
}

// 1. 获取下载链接（需验证许可证）
async function getDownloadLink(data, clientIp, userAgent) {
  const { 
    licenseKey, 
    platform = 'auto', 
    deviceId = 'web',
    deviceName = 'Browser Download'
  } = data
  
  if (!licenseKey) {
    throw new Error('缺少必要参数：licenseKey')
  }
  
  // 验证许可证
  const licenseResult = await licensesCollection
    .where({ licenseKey: licenseKey, status: 'ACTIVE' })
    .get()
  
  if (licenseResult.data.length === 0) {
    await logDownload('DOWNLOAD_FAILED', 'FAILED', {
      licenseKey: licenseKey,
      deviceId: deviceId,
      clientIp, userAgent,
      details: { message: '许可证无效或已失效' }
    })
    
    return {
      success: false,
      message: '许可证无效或已失效，请联系客服'
    }
  }
  
  const license = licenseResult.data[0]
  
  // 检查许可证是否过期
  if (license.expiresAt && new Date() > new Date(license.expiresAt)) {
    return {
      success: false,
      message: '许可证已过期，请联系客服'
    }
  }
  
  // 根据平台选择合适的下载包
  let selectedPlatform = platform
  if (platform === 'auto') {
    // 根据 User-Agent 自动检测平台
    const ua = userAgent.toLowerCase()
    if (ua.includes('mac')) {
      // 检测是否为 Apple Silicon
      if (ua.includes('arm') || ua.includes('m1') || ua.includes('m2') || ua.includes('m3')) {
        selectedPlatform = 'macos-arm64'
      } else {
        selectedPlatform = 'macos-x64-dmg' // 默认使用DMG版本
      }
    } else if (ua.includes('win')) {
      // 优先选择64位版本
      selectedPlatform = 'windows-x64'
    } else if (ua.includes('linux')) {
      // 默认使用AppImage版本，更通用
      selectedPlatform = 'linux-x64-appimage'
    } else {
      selectedPlatform = 'macos-x64-dmg' // 默认
    }
  }
  
  const softwareInfo = SOFTWARE_PACKAGES[selectedPlatform]
  if (!softwareInfo) {
    return {
      success: false,
      message: '不支持的平台或版本'
    }
  }
  
  
  // 记录下载
  const downloadId = `DL-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`
  
  try {
    await downloadsCollection.add({
      downloadId: downloadId,
      licenseId: license.licenseId,
      licenseKey: licenseKey,
      
      // 软件信息
      platform: softwareInfo.platform,
      arch: softwareInfo.arch,
      fileName: softwareInfo.fileName,
      fileSize: softwareInfo.size,
      
      // 下载者信息
      deviceId: deviceId,
      deviceName: deviceName,
      userAgent: userAgent,
      clientIp: clientIp,
      
      // 时间信息
      downloadedAt: new Date(),
      createdAt: new Date()
    })
  } catch (downloadLogError) {
    console.log('⚠️ 下载记录保存失败（非致命错误）:', downloadLogError.message)
  }
  
  await logDownload('DOWNLOAD_SUCCESS', 'SUCCESS', {
    licenseId: license.licenseId,
    licenseKey: licenseKey,
    deviceId: deviceId,
    clientIp, userAgent,
    platform: selectedPlatform,
    details: {
      message: '软件下载链接获取成功',
      fileName: softwareInfo.fileName,
      downloadId: downloadId
    }
  })
  
  return {
    success: true,
    download: {
      downloadId: downloadId,
      name: softwareInfo.name,
      fileName: softwareInfo.fileName,
      url: softwareInfo.url,
      size: softwareInfo.size,
      platform: softwareInfo.platform,
      arch: softwareInfo.arch,
      requirements: softwareInfo.requirements,
      icon: softwareInfo.icon
    },
    license: {
      licenseKey: license.licenseKey,
      customerName: license.customerName,
      issuedAt: license.issuedAt,
      maxDevices: license.maxDevices
    },
    message: '下载链接获取成功'
  }
}

// 2. 获取可用软件列表
async function getSoftwareList(data, clientIp, userAgent) {
  await logDownload('LIST_REQUEST', 'SUCCESS', {
    clientIp, userAgent,
    details: { message: '软件列表查询' }
  })
  
  // 返回所有可用的软件包信息
  const availablePackages = Object.keys(SOFTWARE_PACKAGES).map(key => {
    const pkg = SOFTWARE_PACKAGES[key]
    return {
      id: key,
      name: pkg.name,
      platform: pkg.platform,
      arch: pkg.arch,
      size: pkg.size,
      requirements: pkg.requirements,
      icon: pkg.icon,
      status: pkg.status || 'available'
    }
  })
  
  return {
    success: true,
    packages: availablePackages,
    message: '软件列表获取成功'
  }
}