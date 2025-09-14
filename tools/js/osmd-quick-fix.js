/**
 * OSMD快速修复补丁
 * 直接解决加载检测问题
 */

(function() {
    'use strict';

    console.log('🔧 OSMD Quick Fix - 应用补丁...');

    // 等待OSMD加载的辅助函数
    window.waitForOSMD = function(timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function check() {
                // 检查各种可能的OSMD对象
                if (window.opensheetmusicdisplay &&
                    window.opensheetmusicdisplay.OpenSheetMusicDisplay) {
                    console.log('✅ OSMD已加载完成');
                    resolve(true);
                    return;
                }

                // 检查超时
                if (Date.now() - startTime > timeout) {
                    console.error('❌ OSMD加载超时');
                    reject(new Error('OSMD加载超时'));
                    return;
                }

                // 继续等待
                setTimeout(check, 100);
            }

            check();
        });
    };

    // 修复原始的生成函数
    const originalGenerateMelody = window.generateMelody;
    if (originalGenerateMelody && !window.generateMelodyFixed) {
        window.generateMelodyFixed = true;

        window.generateMelody = async function() {
            console.log('🎵 [Quick Fix] 生成旋律...');

            // 先等待OSMD加载
            try {
                await window.waitForOSMD(5000);
                console.log('✅ [Quick Fix] OSMD就绪，调用原始函数');
            } catch (error) {
                console.error('⚠️ [Quick Fix] OSMD未就绪，但仍尝试生成');
            }

            // 调用原始函数
            return originalGenerateMelody.apply(this, arguments);
        };
    }

    // 监听DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyFixes);
    } else {
        setTimeout(applyFixes, 100);
    }

    function applyFixes() {
        console.log('🔍 [Quick Fix] 检查OSMD状态...');

        // 如果OSMD还没加载，手动加载本地版本
        if (!window.opensheetmusicdisplay) {
            console.log('⚠️ [Quick Fix] OSMD未检测到，尝试加载本地版本');

            const script = document.createElement('script');
            script.src = '/tools/js/opensheetmusicdisplay.min.js';
            script.onload = function() {
                console.log('✅ [Quick Fix] 本地OSMD加载成功');

                // 触发自定义事件
                window.dispatchEvent(new Event('OSMDLoaded'));
            };
            script.onerror = function() {
                console.error('❌ [Quick Fix] 本地OSMD加载失败');
            };
            document.head.appendChild(script);
        } else {
            console.log('✅ [Quick Fix] OSMD已存在');
        }

        // 添加全局错误处理
        window.addEventListener('error', function(event) {
            if (event.message && event.message.includes('opensheetmusicdisplay')) {
                console.error('🚨 [Quick Fix] OSMD相关错误:', event.message);

                // 显示友好的错误信息
                const scoreDiv = document.getElementById('score');
                if (scoreDiv && !scoreDiv.querySelector('.osmd-error')) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'osmd-error';
                    errorDiv.style.cssText = `
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        background: #fff3e0;
                        color: #e65100;
                        padding: 10px 15px;
                        border-radius: 5px;
                        font-size: 12px;
                        z-index: 1000;
                    `;
                    errorDiv.innerHTML = `
                        ⚠️ 乐谱渲染遇到问题
                        <button onclick="location.reload()" style="
                            margin-left: 10px;
                            padding: 2px 8px;
                            border: 1px solid #e65100;
                            background: white;
                            color: #e65100;
                            border-radius: 3px;
                            cursor: pointer;
                            font-size: 11px;
                        ">刷新</button>
                    `;
                    scoreDiv.appendChild(errorDiv);

                    // 5秒后自动隐藏
                    setTimeout(() => errorDiv.remove(), 5000);
                }
            }
        });
    }

    // 导出调试工具
    window.OSMDQuickFix = {
        checkStatus: function() {
            const status = {
                osmdExists: !!window.opensheetmusicdisplay,
                osmdReady: !!(window.opensheetmusicdisplay && window.opensheetmusicdisplay.OpenSheetMusicDisplay),
                generateMelodyExists: !!window.generateMelody,
                fixApplied: !!window.generateMelodyFixed
            };
            console.table(status);
            return status;
        },
        forceReload: async function() {
            console.log('🔄 强制重新加载OSMD...');
            const script = document.createElement('script');
            script.src = '/tools/js/opensheetmusicdisplay.min.js?t=' + Date.now();
            document.head.appendChild(script);
            await window.waitForOSMD(10000);
            console.log('✅ OSMD重新加载完成');
        }
    };

    console.log('✅ [Quick Fix] 补丁应用完成');

})();