/**
 * IC Studio - 安装包下载云函数
 * 通过访问码验证并提供安装包下载链接
 */

const cloud = require('@cloudbase/node-sdk');

// 安装包文件映射
const INSTALL_PACKAGES = {
    'windows-exe': {
        path: 'install-packages/IC-Studio-1.0.0-win.exe',
        name: 'IC Studio 视奏工具 - Windows 安装程序',
        description: '适用于 Windows 10/11 的标准安装程序',
        size: '140.9 MB',
        url: 'https://cloud1-4g1r5ho01a0cfd85.ap-shanghai.app.tcloudbase.com/install-packages/IC-Studio-1.0.0-win.exe'
    },
    'windows-x64': {
        path: 'install-packages/IC-Studio-1.0.0-win-x64.exe',
        name: 'IC Studio 视奏工具 - Windows x64',
        description: '适用于 64位 Windows 系统的优化版本',
        size: '73.2 MB',
        url: 'https://cloud1-4g1r5ho01a0cfd85.ap-shanghai.app.tcloudbase.com/install-packages/IC-Studio-1.0.0-win-x64.exe'
    },
    'macos-x64-zip': {
        path: 'install-packages/IC-Studio-1.0.0-mac-x64.zip',
        name: 'IC Studio 视奏工具 - macOS Intel (ZIP)',
        description: '适用于 Intel 芯片 Mac 的压缩包版本',
        size: '91.2 MB',
        url: 'https://cloud1-4g1r5ho01a0cfd85.ap-shanghai.app.tcloudbase.com/install-packages/IC-Studio-1.0.0-mac-x64.zip'
    },
    'macos-x64-dmg': {
        path: 'install-packages/IC-Studio-1.0.0-mac-x64.dmg',
        name: 'IC Studio 视奏工具 - macOS Intel (DMG)',
        description: '适用于 Intel 芯片 Mac 的磁盘镜像版本',
        size: '86.2 MB',
        url: 'https://cloud1-4g1r5ho01a0cfd85.ap-shanghai.app.tcloudbase.com/install-packages/IC-Studio-1.0.0-mac-x64.dmg'
    },
    'macos-arm64-zip': {
        path: 'install-packages/IC-Studio-1.0.0-mac-arm64.zip',
        name: 'IC Studio 视奏工具 - macOS Apple Silicon (ZIP)',
        description: '适用于 M1/M2/M3 芯片 Mac 的压缩包版本',
        size: '86.6 MB',
        url: 'https://cloud1-4g1r5ho01a0cfd85.ap-shanghai.app.tcloudbase.com/install-packages/IC-Studio-1.0.0-mac-arm64.zip'
    },
    'linux-deb': {
        path: 'install-packages/IC-Studio-1.0.0-linux-amd64.deb',
        name: 'IC Studio 视奏工具 - Linux (DEB)',
        description: '适用于 Ubuntu/Debian 系统的软件包',
        size: '70.3 MB',
        url: 'https://cloud1-4g1r5ho01a0cfd85.ap-shanghai.app.tcloudbase.com/install-packages/IC-Studio-1.0.0-linux-amd64.deb'
    },
    'linux-appimage': {
        path: 'install-packages/IC-Studio-1.0.0-linux-x86_64.AppImage',
        name: 'IC Studio 视奏工具 - Linux (AppImage)',
        description: '适用于所有 Linux 发行版的便携版本',
        size: '77.6 MB',
        url: 'https://cloud1-4g1r5ho01a0cfd85.ap-shanghai.app.tcloudbase.com/install-packages/IC-Studio-1.0.0-linux-x86_64.AppImage'
    }
};

exports.main = async (event, context) => {
    console.log('📦 安装包下载服务启动');
    console.log('📨 接收参数:', JSON.stringify(event, null, 2));
    
    // CORS头部
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Request-Source',
        'Content-Type': 'application/json'
    };
    
    // 处理预检请求
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }
    
    try {
        const app = cloud.init({
            env: cloud.SYMBOL_CURRENT_ENV
        });
        const db = app.database();
        
        // 解析请求参数
        let requestData = {};
        if (event.body) {
            try {
                requestData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
            } catch (e) {
                requestData = event;
            }
        } else {
            requestData = event;
        }
        
        const { access_code, platform, action } = requestData;
        
        // 如果只是获取可用的安装包列表
        if (action === 'list') {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    packages: INSTALL_PACKAGES,
                    platform_info: {
                        windows: {
                            name: 'Windows',
                            options: ['windows-exe', 'windows-x64'],
                            note: 'windows-exe 为完整安装包，windows-x64 为优化版本'
                        },
                        macos: {
                            name: 'macOS',
                            options: ['macos-x64-zip', 'macos-x64-dmg', 'macos-arm64-zip'],
                            note: 'Intel 芯片选择 x64 版本，Apple Silicon (M1/M2/M3) 选择 arm64 版本'
                        },
                        linux: {
                            name: 'Linux',
                            options: ['linux-deb', 'linux-appimage'],
                            note: 'Ubuntu/Debian 推荐 DEB 包，其他发行版推荐 AppImage'
                        }
                    }
                })
            };
        }
        
        if (!access_code) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: '请提供访问码'
                })
            };
        }
        
        if (!platform || !INSTALL_PACKAGES[platform]) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: '请选择有效的安装包类型',
                    available_platforms: Object.keys(INSTALL_PACKAGES)
                })
            };
        }
        
        console.log(`🔍 验证访问码: ${access_code.toUpperCase()}`);
        console.log(`📱 请求平台: ${platform}`);
        
        // 验证访问码
        const codeQuery = await db.collection('codes')
            .where({ code: access_code.toUpperCase() })
            .get();
        
        if (codeQuery.data.length === 0) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: '访问码不存在或无效'
                })
            };
        }
        
        const codeRecord = codeQuery.data[0];
        
        // 检查状态
        if (codeRecord.status === 'refunded') {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: '该访问码已退款，无法下载'
                })
            };
        }
        
        // 查找对应订单检查支付状态
        const orderNo = codeRecord.out_trade_no;
        if (orderNo) {
            const orderQuery = await db.collection('orders')
                .where({ out_trade_no: orderNo })
                .get();
            
            if (orderQuery.data.length > 0) {
                const orderRecord = orderQuery.data[0];
                if (orderRecord.status !== 'paid') {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: '订单未完成支付，无法下载'
                        })
                    };
                }
                
                // 检查退款状态
                if (orderRecord.refund_status === 'refunded') {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: '订单已退款，无法下载'
                        })
                    };
                }
            }
        }
        
        console.log('✅ 访问码验证通过');
        
        // 获取文件下载URL
        const packageInfo = INSTALL_PACKAGES[platform];
        console.log(`📥 生成临时下载链接: ${packageInfo.path}`);
        
        // 生成CloudBase存储文件的下载链接
        let downloadUrl;
        
        console.log(`🔍 开始生成下载链接，文件路径: ${packageInfo.path}`);
        
        try {
            // 使用CloudBase SDK获取临时文件下载链接
            console.log('📱 正在调用getTempFileURL...');
            const downloadResult = await app.getTempFileURL({
                fileList: [packageInfo.path]
            });
            
            console.log('📋 getTempFileURL结果:', JSON.stringify(downloadResult, null, 2));
            
            if (downloadResult.fileList && downloadResult.fileList.length > 0) {
                const fileInfo = downloadResult.fileList[0];
                console.log('📁 文件信息:', JSON.stringify(fileInfo, null, 2));
                
                if (fileInfo.code === 'SUCCESS' && fileInfo.tempFileURL) {
                    downloadUrl = fileInfo.tempFileURL;
                    console.log('✅ 成功生成临时下载链接:', downloadUrl);
                } else if (fileInfo.code) {
                    throw new Error(`getTempFileURL返回错误: ${fileInfo.code} - ${fileInfo.message || '未知错误'}`);
                } else {
                    throw new Error('getTempFileURL返回的文件信息无效');
                }
            } else {
                throw new Error('getTempFileURL返回空的文件列表');
            }
        } catch (urlError) {
            console.error('❌ 生成临时URL失败:', urlError);
            
            // 备用方案：使用预设的静态URL
            downloadUrl = packageInfo.url;
            console.log('🔄 使用备用下载链接:', downloadUrl);
        }
        
        // 记录下载日志
        try {
            await db.collection('download_logs').add({
                data: {
                    access_code: access_code.toUpperCase(),
                    platform: platform,
                    package_name: packageInfo.name,
                    package_path: packageInfo.path,
                    download_url: downloadUrl,
                    order_no: orderNo,
                    download_time: new Date(),
                    ip_address: event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown',
                    user_agent: event.headers['user-agent'] || 'unknown',
                    request_id: context.requestId
                }
            });
        } catch (logError) {
            console.warn('⚠️ 下载日志记录失败:', logError);
        }
        
        console.log('🎉 下载链接生成成功');
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: '下载链接生成成功',
                data: {
                    access_code: access_code.toUpperCase(),
                    platform: platform,
                    package_info: packageInfo,
                    download_url: downloadUrl,
                    expires_in: '24小时',
                    download_time: new Date(),
                    size: packageInfo.size
                }
            })
        };
        
    } catch (error) {
        console.error('❌ 下载服务错误:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: '服务器错误',
                message: error.message
            })
        };
    }
};