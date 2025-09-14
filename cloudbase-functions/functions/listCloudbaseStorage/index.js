/**
 * 列出CloudBase存储中的文件
 * 检查安装包文件是否存在以及正确的路径
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('📁 开始检查CloudBase存储文件...');
    
    try {
        const app = cloud.init({
            env: cloud.SYMBOL_CURRENT_ENV
        });
        
        // 尝试列出存储中的文件
        try {
            // 方法1：使用storage API
            const storage = app.storage();
            
            // 列出根目录文件
            let fileList = await storage.listFiles({
                prefix: '',
                maxKeys: 100
            });
            console.log('📋 根目录文件列表:', fileList);
            
            // 检查install-packages目录
            let installPackages = await storage.listFiles({
                prefix: 'install-packages/',
                maxKeys: 100
            });
            console.log('📦 install-packages目录:', installPackages);
            
            return {
                success: true,
                data: {
                    root_files: fileList,
                    install_packages: installPackages,
                    analysis: {
                        total_root_files: fileList ? fileList.length : 0,
                        install_packages_count: installPackages ? installPackages.length : 0,
                        note: "Check if install-packages directory exists and contains the required files"
                    }
                },
                timestamp: new Date()
            };
            
        } catch (storageError) {
            console.warn('⚠️ Storage API方式失败:', storageError);
            
            // 方法2：尝试直接检查文件是否存在
            const expectedFiles = [
                'install-packages/IC-Studio-1.0.0-win.exe',
                'install-packages/IC-Studio-1.0.0-win-x64.exe',
                'install-packages/IC-Studio-1.0.0-mac-x64.zip',
                'install-packages/IC-Studio-1.0.0-mac-x64.dmg',
                'install-packages/IC-Studio-1.0.0-mac-arm64.zip',
                'install-packages/IC-Studio-1.0.0-linux-amd64.deb',
                'install-packages/IC-Studio-1.0.0-linux-x86_64.AppImage'
            ];
            
            const fileChecks = [];
            
            for (const filePath of expectedFiles) {
                try {
                    // 尝试获取文件的临时URL来检查是否存在
                    const tempUrlResult = await app.getTempFileURL({
                        fileList: [filePath]
                    });
                    
                    fileChecks.push({
                        path: filePath,
                        exists: tempUrlResult.fileList && tempUrlResult.fileList[0] && tempUrlResult.fileList[0].code === 'SUCCESS',
                        result: tempUrlResult.fileList[0]
                    });
                    
                } catch (fileError) {
                    fileChecks.push({
                        path: filePath,
                        exists: false,
                        error: fileError.message
                    });
                }
            }
            
            return {
                success: true,
                data: {
                    storage_api_error: storageError.message,
                    file_checks: fileChecks,
                    existing_files: fileChecks.filter(f => f.exists),
                    missing_files: fileChecks.filter(f => !f.exists),
                    analysis: {
                        total_expected: expectedFiles.length,
                        found: fileChecks.filter(f => f.exists).length,
                        missing: fileChecks.filter(f => !f.exists).length
                    }
                },
                timestamp: new Date()
            };
        }
        
    } catch (error) {
        console.error('❌ 检查存储失败:', error);
        return {
            success: false,
            error: error.message,
            suggestion: "Maybe the storage permissions are not configured correctly or files don't exist",
            timestamp: new Date()
        };
    }
};