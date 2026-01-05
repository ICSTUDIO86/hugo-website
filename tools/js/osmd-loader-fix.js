/**
 * OSMD库加载修复脚本
 * 解决CDN加载失败和本地备份回退机制
 */

(function() {
    'use strict';

    console.log('🎵 OSMD Loader Fix - 初始化...');

    // 配置
    const CONFIG = {
        CDN_URL: 'https://cdn.jsdelivr.net/npm/opensheetmusicdisplay@1.8.5/build/opensheetmusicdisplay.min.js',
        LOCAL_URL: '/tools/js/opensheetmusicdisplay.min.js',
        MAX_RETRIES: 3,
        RETRY_DELAY: 2000
    };

    let retryCount = 0;

    /**
     * 动态加载脚本
     */
    function loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;

            script.onload = () => {
                console.log(`✅ 成功加载: ${url}`);
                resolve();
            };

            script.onerror = () => {
                console.error(`❌ 加载失败: ${url}`);
                reject(new Error(`Failed to load ${url}`));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * 检查OSMD是否已加载
     */
    function checkOSMD() {
        // 检查多种可能的全局变量
        return !!(
            window.opensheetmusicdisplay ||
            window.OSMD ||
            window.OpenSheetMusicDisplay ||
            (window.opensheetmusicdisplay && window.opensheetmusicdisplay.OpenSheetMusicDisplay)
        );
    }

    /**
     * 尝试加载OSMD
     */
    async function tryLoadOSMD() {
        // 首先检查是否已经加载
        if (checkOSMD()) {
            console.log('✅ OSMD已存在，无需重新加载');
            return true;
        }

        // 尝试从CDN加载
        try {
            console.log('🌐 尝试从CDN加载OSMD...');
            await loadScript(CONFIG.CDN_URL);

            // 等待一下让库初始化
            await new Promise(resolve => setTimeout(resolve, 500));

            if (checkOSMD()) {
                console.log('✅ CDN加载成功');
                return true;
            }
        } catch (error) {
            console.warn('⚠️ CDN加载失败，尝试本地备份...');
        }

        // CDN失败，尝试本地备份
        try {
            console.log('📦 加载本地OSMD备份...');
            await loadScript(CONFIG.LOCAL_URL);

            // 等待初始化
            await new Promise(resolve => setTimeout(resolve, 500));

            if (checkOSMD()) {
                console.log('✅ 本地备份加载成功');
                return true;
            }
        } catch (error) {
            console.error('❌ 本地备份也加载失败');
        }

        return false;
    }

    /**
     * 修复OSMD检测问题
     */
    function fixOSMDDetection() {
        // 创建全局别名，确保兼容性
        if (window.opensheetmusicdisplay && !window.OSMD) {
            window.OSMD = window.opensheetmusicdisplay;
            console.log('✅ 创建OSMD全局别名');
        }

        // 修复检测函数
        const originalCheck = window.checkOSMDLoaded;
        if (originalCheck) {
            window.checkOSMDLoaded = function() {
                return checkOSMD();
            };
        }

        // 在window上设置标记
        window.OSMDLoaded = true;
    }

    /**
     * 显示加载状态
     */
    function showLoadingStatus(message, isError = false) {
        const scoreDiv = document.getElementById('score');
        if (!scoreDiv) return;

        // 如果不是错误状态，不显示任何内容，避免干扰
        if (!isError) {
            console.log('🔄 OSMD状态:', message);
            return;
        }

        // 只在真正的错误情况下才显示错误信息
        scoreDiv.innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <div style="color: #f44336; font-size: 18px; margin-bottom: 20px;">
                    ⚠️ 乐谱渲染库加载问题
                </div>
                <div style="color: #666; margin-bottom: 20px;">${message}</div>
                <button onclick="location.reload()" style="
                    background: #4CAF50;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                ">刷新重试</button>
            </div>
        `;
    }

    /**
     * 主初始化函数
     */
    async function init() {
        console.log('🚀 开始OSMD加载修复流程...');

        // 不显示加载状态，避免干扰
        showLoadingStatus('正在加载乐谱渲染引擎...');

        // 尝试加载OSMD
        const success = await tryLoadOSMD();

        if (success) {
            fixOSMDDetection();

            // 清除错误状态，恢复默认内容
            const scoreDiv = document.getElementById('score');
            if (scoreDiv && scoreDiv.innerHTML && (
                scoreDiv.innerHTML.includes('乐谱渲染引擎') ||
                scoreDiv.innerHTML.includes('依赖库未加载') ||
                scoreDiv.innerHTML.includes('OpenSheetMusicDisplay')
            )) {
                // 恢复默认的空白状态
                scoreDiv.innerHTML = `
                    <div class="empty-score-message">
                        <p data-i18n="score.empty">点击生成旋律开始练习</p>
                    </div>
                `;
            }

            // 触发页面的OSMD就绪事件
            window.dispatchEvent(new Event('OSMDReady'));

            console.log('🎉 OSMD加载修复完成');
        } else {
            // 延迟显示错误，给更多时间让OSMD加载
            setTimeout(() => {
                if (!checkOSMD()) {
                    showLoadingStatus('无法加载乐谱渲染库，请检查网络连接', true);
                    console.error('❌ OSMD加载完全失败');
                }
            }, 2000);
        }
    }

    // 等待DOM就绪后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(init, 1000); // 延迟1秒给OSMD更多加载时间
        });
    } else {
        // DOM已加载，延迟执行以确保其他脚本先运行
        setTimeout(init, 1000);
    }

    // 监听页面刷新，确保恢复默认状态
    window.addEventListener('beforeunload', function() {
        const scoreDiv = document.getElementById('score');
        if (scoreDiv && scoreDiv.innerHTML && (
            scoreDiv.innerHTML.includes('依赖库未加载') ||
            scoreDiv.innerHTML.includes('OpenSheetMusicDisplay') ||
            scoreDiv.innerHTML.includes('乐谱渲染引擎')
        )) {
            scoreDiv.innerHTML = `
                <div class="empty-score-message">
                    <p data-i18n="score.empty">点击生成旋律开始练习</p>
                </div>
            `;
        }
    });

    // 页面完全加载后再次检查
    window.addEventListener('load', function() {
        setTimeout(async function() {
            // 清除任何可能的错误显示，恢复默认内容
            const scoreDiv = document.getElementById('score');
            if (scoreDiv && scoreDiv.innerHTML && (
                scoreDiv.innerHTML.includes('依赖库未加载') ||
                scoreDiv.innerHTML.includes('OpenSheetMusicDisplay')
            )) {
                // 恢复默认的空白状态
                scoreDiv.innerHTML = `
                    <div class="empty-score-message">
                        <p data-i18n="score.empty">点击生成旋律开始练习</p>
                    </div>
                `;
            }

            // 如果OSMD仍未就绪，静默重新初始化（不显示错误）
            if (!checkOSMD()) {
                console.log('🔄 页面load后OSMD仍未就绪，静默重新初始化');
                await tryLoadOSMD();
                if (checkOSMD()) {
                    fixOSMDDetection();
                    window.dispatchEvent(new Event('OSMDReady'));
                }
            }
        }, 1500);
    });

    // 导出工具函数供调试
    window.OSMDLoaderFix = {
        checkOSMD,
        tryLoadOSMD,
        fixOSMDDetection,
        CONFIG
    };

})();