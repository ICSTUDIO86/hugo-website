/**
 * 音程视奏渲染器
 * 版本：4.0.0
 * 负责将音程数据渲染为可视化乐谱
 */

class IntervalRenderer {
    constructor() {
        console.log('🎨 IntervalRenderer V4.0 初始化');

        this.osmd = null;
        this.scoreContainerId = 'score';
        this.isRendering = false;
    }

    /**
     * 渲染音程进行
     * @param {string|Object} input - MusicXML字符串或音程进行对象
     * @returns {Promise} 渲染结果
     */
    async render(input) {
        console.log('🎨 开始渲染音程');

        // 防止重复渲染
        if (this.isRendering) {
            console.warn('⚠️ 渲染进行中，请等待...');
            return;
        }

        this.isRendering = true;

        try {
            // 获取乐谱容器
            const scoreContainer = document.getElementById(this.scoreContainerId);
            if (!scoreContainer) {
                throw new Error(`找不到乐谱容器: #${this.scoreContainerId}`);
            }

            // 清空容器
            this.clear();

            // 如果输入是进行对象，先转换为MusicXML
            let musicXML = input;
            if (typeof input === 'object' && input.measures) {
                console.log('📄 将进行对象转换为MusicXML');
                const generator = new IntervalGenerator();
                musicXML = generator.generateMusicXML(input);
            }

            // 检查OSMD是否可用
            if (!window.opensheetmusicdisplay || !window.opensheetmusicdisplay.OpenSheetMusicDisplay) {
                console.error('❌ OpenSheetMusicDisplay未加载');
                throw new Error('OpenSheetMusicDisplay库未加载');
            }

            // 创建OSMD实例（与旋律视奏工具配置一致）
            console.log('🎼 创建OSMD实例 - 使用VexFlow后端');
            this.osmd = new window.opensheetmusicdisplay.OpenSheetMusicDisplay(scoreContainer, {
                autoResize: true,
                backend: 'vexflow',  // 🎯 关键修复：使用VexFlow后端与旋律视奏工具一致
                drawTitle: false,
                drawSubtitle: false,
                drawComposer: false,
                drawLyricist: false,
                drawCredits: false,
                drawPartNames: false
            });

            // 加载MusicXML
            console.log('📥 加载MusicXML数据');
            await this.osmd.load(musicXML);

            // 应用基本布局配置（与旋律视奏工具保持一致）
            this.applyBasicLayoutSettings();

            // 应用智能缩放 - 基于屏幕大小、方向和旋律长度自适应
            this.applyIntelligentZoom();

            // 渲染乐谱
            console.log('🖼️ 渲染乐谱');
            this.osmd.render();

            // 应用自适应布局
            this.applyResponsiveLayout();

            console.log('✅ 渲染完成');

            // 返回渲染信息
            return {
                success: true,
                measureCount: this.osmd.sheet.sourceMeasures.length,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ 渲染失败:', error);

            // 显示错误信息
            const scoreContainer = document.getElementById(this.scoreContainerId);
            if (scoreContainer) {
                scoreContainer.innerHTML = `
                    <div style="padding: 20px; background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; border-radius: 4px;">
                        <h3>🚫 渲染失败</h3>
                        <p>${error.message}</p>
                        <details>
                            <summary>详细错误信息</summary>
                            <pre style="font-size: 12px; overflow: auto;">${error.stack}</pre>
                        </details>
                    </div>
                `;
            }

            throw error;

        } finally {
            this.isRendering = false;
        }
    }

    /**
     * 清空乐谱显示
     */
    clear() {
        const scoreContainer = document.getElementById(this.scoreContainerId);
        if (scoreContainer) {
            scoreContainer.innerHTML = '';
        }

        if (this.osmd) {
            try {
                this.osmd.clear();
            } catch (e) {
                console.warn('清理OSMD实例时出错:', e);
            }
            this.osmd = null;
        }

        console.log('🧹 乐谱已清空');
    }

    /**
     * 应用基本布局配置（与旋律视奏工具保持一致）
     */
    applyBasicLayoutSettings() {
        if (!this.osmd || !this.osmd.EngravingRules) {
            console.warn('⚠️ EngravingRules不可用，跳过布局配置');
            return;
        }

        console.log('📐 应用强力布局配置');

        try {
            const totalMeasures = this.osmd.sheet.sourceMeasures.length;
            console.log(`🎼 总小节数: ${totalMeasures}`);

            // 获取屏幕尺寸用于手机端适配
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            console.log(`📱 屏幕尺寸: ${screenWidth} x ${screenHeight}px`);

            // 🔑 强力策略：同时使用多种方法确保多小节每行
            console.log('🎯 应用强力多小节布局...');

            // 第一层：设置系统小节数限制 - 手机端特殊处理
            if (screenWidth <= 599) {
                // 手机端：严格控制换行位置
                console.log('🎯 手机端：严格换行控制策略');

                if (totalMeasures <= 4) {
                    // ≤4小节：强制单行显示，不换行
                    this.osmd.EngravingRules.MaxMeasuresPerSystem = totalMeasures;
                    this.osmd.EngravingRules.MinMeasuresPerSystem = totalMeasures;
                    if ("RenderXMeasuresPerLineAkaSystem" in this.osmd.EngravingRules) {
                        this.osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = totalMeasures;
                    }
                    console.log(`🎯 ≤4小节模式：${totalMeasures}小节强制单行，不允许换行`);
                } else {
                    // >4小节：严格4小节一行
                    this.osmd.EngravingRules.MaxMeasuresPerSystem = 4;
                    this.osmd.EngravingRules.MinMeasuresPerSystem = 4;
                    if ("RenderXMeasuresPerLineAkaSystem" in this.osmd.EngravingRules) {
                        this.osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = 4;
                    }
                    this.osmd.EngravingRules.CompactMode = true;
                    console.log(`🎯 >4小节模式：严格每行4小节，启用CompactMode + 额外缩放`);
                }
            } else {
                // 桌面端：同样严格控制换行位置
                console.log('🎯 桌面端：严格换行控制策略');

                if (totalMeasures <= 4) {
                    // ≤4小节：强制单行显示，不换行
                    this.osmd.EngravingRules.MaxMeasuresPerSystem = totalMeasures;
                    this.osmd.EngravingRules.MinMeasuresPerSystem = totalMeasures;
                    if ("RenderXMeasuresPerLineAkaSystem" in this.osmd.EngravingRules) {
                        this.osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = totalMeasures;
                    }
                    console.log(`🎯 ≤4小节模式：${totalMeasures}小节强制单行，不允许换行`);
                } else {
                    // >4小节：严格4小节一行
                    this.osmd.EngravingRules.MaxMeasuresPerSystem = 4;
                    this.osmd.EngravingRules.MinMeasuresPerSystem = 4;
                    if ("RenderXMeasuresPerLineAkaSystem" in this.osmd.EngravingRules) {
                        this.osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = 4;
                    }
                    this.osmd.EngravingRules.CompactMode = true;
                    console.log(`🎯 >4小节模式：严格每行4小节，启用CompactMode + 额外缩放`);
                }
            }

            // 第二层：启用MusicXML换行标记
            if ("NewSystemFromXMLNewSystemAttribute" in this.osmd.EngravingRules) {
                this.osmd.EngravingRules.NewSystemFromXMLNewSystemAttribute = true;  // 改为true以支持MusicXML换行
            }
            if ("NewSystemAtXMLNewSystemAttribute" in this.osmd.EngravingRules) {
                this.osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;  // 改为true以支持MusicXML换行
            }
            if ("NewSystemAtXMLNewSystem" in this.osmd.EngravingRules) {
                this.osmd.EngravingRules.NewSystemAtXMLNewSystem = true;  // 启用<print new-system="yes"/>标记
                console.log('✅ 启用NewSystemAtXMLNewSystem - 支持MusicXML换行标记');
            }

            // 第三层：设置合适的边距和间距 - 减小边距让乐谱更大
            // 自适应边距 - 手机端和横屏完全无留白
            const isLandscape = screenWidth > screenHeight && screenHeight <= 599; // 横屏且是手机设备
            const isMobile = screenWidth <= 599 || isLandscape;

            if ("PageLeftMargin" in this.osmd.EngravingRules) {
                this.osmd.EngravingRules.PageLeftMargin = isMobile ? 1 : 6;
            }
            if ("PageRightMargin" in this.osmd.EngravingRules) {
                this.osmd.EngravingRules.PageRightMargin = isMobile ? 1 : 6;
            }
            if ("SystemLeftMargin" in this.osmd.EngravingRules) {
                this.osmd.EngravingRules.SystemLeftMargin = isMobile ? 0.5 : 6;
            }
            if ("SystemRightMargin" in this.osmd.EngravingRules) {
                this.osmd.EngravingRules.SystemRightMargin = isMobile ? 0.5 : 6;
            }

            // 手机端和横屏额外的适中边距设置
            if (isMobile) {
                console.log(`📱 ${isLandscape ? '横屏' : '手机'}边距优化：适中边距设置`);
                if ("PageTopMargin" in this.osmd.EngravingRules) {
                    this.osmd.EngravingRules.PageTopMargin = 0;
                }
                if ("PageBottomMargin" in this.osmd.EngravingRules) {
                    this.osmd.EngravingRules.PageBottomMargin = 0;
                }
                if ("TitleTopDistance" in this.osmd.EngravingRules) {
                    this.osmd.EngravingRules.TitleTopDistance = 0;
                }
                if ("TitleBottomDistance" in this.osmd.EngravingRules) {
                    this.osmd.EngravingRules.TitleBottomDistance = 0;
                }
                if ("SubtitleTopDistance" in this.osmd.EngravingRules) {
                    this.osmd.EngravingRules.SubtitleTopDistance = 0;
                }
            }

            // 第四层：调整小节间距
            if ("BetweenMeasuresDistance" in this.osmd.EngravingRules) {
                this.osmd.EngravingRules.BetweenMeasuresDistance = 15;
            }

            // 第五层：调整系统间距
            if ("SystemDistance" in this.osmd.EngravingRules) {
                this.osmd.EngravingRules.SystemDistance = 20;
            }

            // 第六层：让最后一行拉伸填满
            if ("StretchLastSystemLine" in this.osmd.EngravingRules) {
                this.osmd.EngravingRules.StretchLastSystemLine = true;
            }
            if ("JustifyLastSystem" in this.osmd.EngravingRules) {
                this.osmd.EngravingRules.JustifyLastSystem = true;
            }

            console.log(`✅ 强力布局配置:`);
            console.log(`   - 每行目标小节数: ${totalMeasures <= 4 ? totalMeasures : 4}`);
            console.log(`   - MinMeasuresPerSystem: ${this.osmd.EngravingRules.MinMeasuresPerSystem}`);
            console.log(`   - MaxMeasuresPerSystem: ${this.osmd.EngravingRules.MaxMeasuresPerSystem}`);

        } catch (error) {
            console.warn('应用强力布局配置时出错:', error);
        }
    }

    /**
     * 应用响应式布局（简化版本）
     */
    applyResponsiveLayout() {
        if (!this.osmd || !this.osmd.sheet) return;

        try {
            // 获取容器和SVG元素
            const scoreContainer = document.getElementById(this.scoreContainerId);
            const svgElement = scoreContainer.querySelector('svg');

            if (svgElement) {
                // 强化居中和自适应设置
                svgElement.style.display = 'block';
                svgElement.style.margin = '0 auto';
                svgElement.style.maxWidth = '100%';
                svgElement.style.height = 'auto';
                svgElement.style.width = 'auto';

                // 确保SVG在容器中居中
                svgElement.style.position = 'relative';
                svgElement.style.left = '50%';
                svgElement.style.transform = 'translateX(-50%)';

                console.log('📐 应用强化布局：SVG完全居中，自适应宽度');
            }

            // 确保容器本身也居中
            if (scoreContainer) {
                scoreContainer.style.textAlign = 'center';
                scoreContainer.style.display = 'flex';
                scoreContainer.style.justifyContent = 'center';
                scoreContainer.style.alignItems = 'center';
                scoreContainer.style.flexDirection = 'column';
            }

            // 隐藏不需要的文本元素
            this.optimizeMeasureLayout();

        } catch (error) {
            console.warn('应用响应式布局时出错:', error);
        }
    }

    /**
     * 优化小节排版布局
     */
    optimizeMeasureLayout() {
        try {
            const scoreContainer = document.getElementById(this.scoreContainerId);
            if (!scoreContainer) return;

            // 查找所有小节相关的SVG元素
            const svgElement = scoreContainer.querySelector('svg');
            if (!svgElement) return;

            // 隐藏不需要的文本元素（标题、作曲者等）
            const textElements = svgElement.querySelectorAll('text');
            textElements.forEach(element => {
                const text = element.textContent || element.innerText || '';
                if (text.includes('Piano') ||
                    text.includes('Untitled') ||
                    text.includes('Instrument') ||
                    text.toLowerCase().includes('composer')) {
                    element.style.display = 'none';
                }
            });

            console.log('🎨 小节布局优化完成');

        } catch (error) {
            console.warn('优化小节布局时出错:', error);
        }
    }

    /**
     * 设置乐谱容器ID
     * @param {string} containerId - 容器元素ID
     */
    setContainerId(containerId) {
        this.scoreContainerId = containerId;
        console.log(`📦 乐谱容器设置为: #${containerId}`);
    }

    /**
     * 获取当前渲染状态
     * @returns {Object} 状态信息
     */
    getStatus() {
        return {
            isRendering: this.isRendering,
            hasScore: this.osmd !== null,
            containerId: this.scoreContainerId,
            measureCount: this.osmd?.sheet?.sourceMeasures?.length || 0
        };
    }

    /**
     * 导出为PNG图片
     * @returns {Promise<Blob>} PNG图片数据
     */
    async exportToPNG() {
        if (!this.osmd || !this.osmd.sheet) {
            throw new Error('没有可导出的乐谱');
        }

        console.log('📸 导出为PNG...');

        // 获取SVG元素
        const svgElement = document.querySelector(`#${this.scoreContainerId} svg`);
        if (!svgElement) {
            throw new Error('找不到SVG元素');
        }

        // 创建Canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 获取SVG尺寸
        const svgRect = svgElement.getBoundingClientRect();
        canvas.width = svgRect.width * 2; // 2x分辨率
        canvas.height = svgRect.height * 2;

        // 设置白色背景
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 将SVG转换为图片
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                ctx.scale(2, 2); // 2x缩放
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(svgUrl);

                canvas.toBlob(blob => {
                    console.log('✅ PNG导出成功');
                    resolve(blob);
                }, 'image/png', 1.0);
            };
            img.onerror = reject;
            img.src = svgUrl;
        });
    }

    /**
     * 高亮显示特定小节
     * @param {number} measureIndex - 小节索引（从0开始）
     * @param {string} color - 高亮颜色
     */
    highlightMeasure(measureIndex, color = '#ffeb3b') {
        if (!this.osmd || !this.osmd.sheet) {
            console.warn('⚠️ 没有可高亮的乐谱');
            return;
        }

        try {
            const measures = document.querySelectorAll(`#${this.scoreContainerId} .measure`);
            if (measures[measureIndex]) {
                measures[measureIndex].style.backgroundColor = color;
                measures[measureIndex].style.opacity = '0.3';
                console.log(`🔆 高亮小节 ${measureIndex + 1}`);
            }
        } catch (error) {
            console.warn('高亮小节时出错:', error);
        }
    }

    /**
     * 清除所有高亮
     */
    clearHighlights() {
        const measures = document.querySelectorAll(`#${this.scoreContainerId} .measure`);
        measures.forEach(measure => {
            measure.style.backgroundColor = '';
            measure.style.opacity = '';
        });
        console.log('🔄 清除所有高亮');
    }

    /**
     * 向后兼容方法 - 旧版本渲染接口
     * @param {Object} progression - 音程进行对象
     * @returns {Promise} 渲染结果
     */
    async renderIntervalProgression(progression) {
        console.log('⚠️ 使用已弃用的方法名 renderIntervalProgression，建议使用 render()');

        try {
            // 如果传入的是音程进行对象，需要先转换为MusicXML
            if (progression && progression.measures) {
                console.log('📄 将音程进行转换为MusicXML');
                const generator = new IntervalGenerator();
                const musicXML = generator.generateMusicXML(progression);
                return await this.render(musicXML);
            } else if (typeof progression === 'string') {
                // 如果传入的是MusicXML字符串
                return await this.render(progression);
            } else {
                throw new Error('无效的输入格式，期望音程进行对象或MusicXML字符串');
            }
        } catch (error) {
            console.error('❌ 向后兼容渲染失败:', error);
            throw error;
        }
    }

    /**
     * 向后兼容方法 - 生成并渲染
     * @param {Object} progression - 音程进行对象
     * @param {number} seed - 随机种子（忽略）
     * @returns {Promise} 渲染结果
     */
    async generateAndRender(progression, seed = 0) {
        console.log('⚠️ 使用已弃用的方法名 generateAndRender');
        return await this.renderIntervalProgression(progression);
    }

    /**
     * 应用智能缩放 - 基于屏幕大小、方向和旋律长度自适应
     */
    applyIntelligentZoom() {
        if (!this.osmd || !this.osmd.sheet) return;

        try {
            const totalMeasures = this.osmd.sheet.sourceMeasures.length;
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            const isLandscape = screenWidth > screenHeight && screenHeight <= 599; // 横屏且是手机设备

            let zoom;
            if (isLandscape) {
                // 横屏模式：更大缩放，充分利用水平空间
                zoom = 0.7;
                console.log(`🔄 横屏自适应缩放: ${zoom} (宽${screenWidth}px 高${screenHeight}px)`);
            } else if (screenWidth <= 360) {
                zoom = 0.35;  // 极小屏幕 - 极度小型化旋律
            } else if (screenWidth <= 480) {
                zoom = 0.45;  // 超小屏幕 - 超小型化旋律
            } else if (screenWidth <= 599) {
                zoom = 0.55;  // 小屏幕 - 小型化旋律
            } else if (screenWidth <= 899) {
                zoom = 0.85;  // 中等屏幕 - 适中
            } else if (screenWidth <= 1200) {
                zoom = 1.4;   // 大屏幕 - 更大显示，充分利用空间
            } else {
                zoom = 1.6;   // 超大屏幕 - 最大显示
            }

            // 🎵 根据旋律长度进一步调整缩放 - 确保换行策略正确
            if (totalMeasures <= 4) {
                // ≤4小节：必须保证单行显示，适度限制缩放
                if (screenWidth > 899) {
                    // 大屏幕上的4小节也需要控制缩放，避免过宽
                    const maxSafeZoom = screenWidth <= 1200 ? 0.9 : 1.0; // 更保守的缩放，确保单行显示
                    zoom = Math.min(zoom, maxSafeZoom);
                    console.log(`🎯 4小节单行保护: 限制缩放至${zoom.toFixed(2)}，避免换行`);
                }
            } else {
                // >4小节：每4小节一行，允许更激进的缩放减少
                const lengthFactor = Math.max(0.6, 1 - (totalMeasures - 4) * 0.08); // 每超过4小节减少8%，最小60%
                zoom *= lengthFactor;
                console.log(`🎯 多行旋律调整: ${totalMeasures}小节 -> 缩放因子${lengthFactor.toFixed(2)} -> 最终缩放${zoom.toFixed(2)}`);
            }

            this.osmd.zoom = zoom;
            console.log(`🔍 最终自适应缩放: ${zoom.toFixed(2)} (屏幕宽度: ${screenWidth}px ${isLandscape ? '横屏' : '竖屏'}, 旋律${totalMeasures}小节)`);

        } catch (error) {
            console.warn('应用智能缩放时出错:', error);
        }
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IntervalRenderer;
}

// 保持向后兼容
window.IntervalRenderer = IntervalRenderer;

console.log('✅ IntervalRenderer V4.0 加载完成');

// ====== 增强OSMD渲染系统 ======

/**
 * 增强的OSMD初始化函数
 */
async function initOSMD() {
    try {
        if (typeof opensheetmusicdisplay === 'undefined') {
            throw new Error('OpenSheetMusicDisplay未加载');
        }

        console.log('🎵 初始化OSMD - 极简配置');

        // 创建OSMD实例 - 最简化配置
        osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay("score", {
            autoResize: true,
            backend: "vexflow",
            drawTitle: false,
            drawSubtitle: false,
            drawComposer: false,
            drawLyricist: false,
            drawCredits: false,
            drawPartNames: false
        });

        // 启用glissando渲染和相关设置
        if (osmd.EngravingRules) {
            console.log('🔍 检查OSMD版本和功能支持:');
            console.log('  - OSMD版本:', typeof osmd.Version !== 'undefined' ? osmd.Version : '未知');
            console.log('  - 后端引擎:', osmd.backendType || '未知');
            console.log('  - EngravingRules对象:', Object.keys(osmd.EngravingRules).filter(key => key.includes('Render')));

            // 检查所有可能的渲染选项
            const allRenderOptions = Object.keys(osmd.EngravingRules).filter(key =>
                key.startsWith('Render') || key.includes('Glissando') || key.includes('Slur')
            );
            console.log('  - 所有渲染相关选项:', allRenderOptions);

            if ("RenderGlissandi" in osmd.EngravingRules) {
                osmd.EngravingRules.RenderGlissandi = true;
                console.log('✅ 已启用OSMD glissando渲染');
            } else {
                console.log('❌ OSMD不支持RenderGlissandi选项');
                console.log('🔍 检查替代选项: RenderGlissandos, DrawGlissando, etc.');

                // 检查可能的替代名称
                const glissandoAlternatives = ['RenderGlissandos', 'DrawGlissando', 'ShowGlissando'];
                glissandoAlternatives.forEach(alt => {
                    if (alt in osmd.EngravingRules) {
                        osmd.EngravingRules[alt] = true;
                        console.log(`✅ 找到并启用替代选项: ${alt}`);
                    }
                });
            }

            // 尝试启用所有可能相关的渲染选项
            const renderOptions = ['RenderSlurs', 'RenderArpeggios', 'RenderTies', 'RenderOrnaments', 'RenderArticulations'];
            renderOptions.forEach(option => {
                if (option in osmd.EngravingRules) {
                    osmd.EngravingRules[option] = true;
                    console.log(`✅ 已启用OSMD ${option}`);
                } else {
                    console.log(`❌ OSMD不支持${option}选项`);
                }
            });

            console.log('🔍 OSMD EngravingRules最终设置:');
            renderOptions.concat(['RenderGlissandi']).forEach(option => {
                if (option in osmd.EngravingRules) {
                    console.log(`  - ${option}: ${osmd.EngravingRules[option]}`);
                } else {
                    console.log(`  - ${option}: 不支持`);
                }
            });
        }

        // 隐藏标题和乐器名称
        if (osmd.EngravingRules) {
            osmd.EngravingRules.drawTitle = false;
            osmd.EngravingRules.drawSubtitle = false;
            osmd.EngravingRules.drawComposer = false;
            osmd.EngravingRules.drawLyricist = false;
            osmd.EngravingRules.drawCredits = false;
            osmd.EngravingRules.drawPartNames = false;
            console.log('✅ 已隐藏标题和乐器名称');
        }

        console.log('✅ OSMD初始化成功');
        return osmd;
    } catch (error) {
        console.error('❌ OSMD初始化失败:', error);
        throw error;
    }
}

/**
 * 增强的乐谱渲染函数
 */
async function renderScore(melodyData) {
    console.log('🎨 开始OSMD渲染 - 新策略');

    const scoreDiv = document.getElementById('score');

    try {
        // 清理
        scoreDiv.innerHTML = '';
        if (osmd) {
            osmd.clear();
            osmd = null;
        }

        // 获取容器实际宽度
        const containerWidth = scoreDiv.clientWidth;
        console.log(`📏 容器宽度: ${containerWidth}px`);

        // 计算总小节数
        const totalMeasures = melodyData.config.measures;
        console.log(`🎵 总小节数: ${totalMeasures}`);

        // 获取屏幕尺寸用于手机端适配
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        console.log(`📱 屏幕尺寸: ${screenWidth} x ${screenHeight}px`);

        // 创建OSMD - 简单配置
        osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay("score", {
            autoResize: true,
            backend: "vexflow",
            drawTitle: false,
            drawSubtitle: false,
            drawComposer: false,
            drawLyricist: false,
            drawCredits: false,
            drawPartNames: false
        });

        // 启用glissando渲染和相关设置
        if (osmd.EngravingRules) {
            console.log('🔍 检查OSMD版本和功能支持:');
            console.log('  - OSMD版本:', typeof osmd.Version !== 'undefined' ? osmd.Version : '未知');
            console.log('  - 后端引擎:', osmd.backendType || '未知');
            console.log('  - EngravingRules对象:', Object.keys(osmd.EngravingRules).filter(key => key.includes('Render')));

            // 检查所有可能的渲染选项
            const allRenderOptions = Object.keys(osmd.EngravingRules).filter(key =>
                key.startsWith('Render') || key.includes('Glissando') || key.includes('Slur')
            );
            console.log('  - 所有渲染相关选项:', allRenderOptions);

            if ("RenderGlissandi" in osmd.EngravingRules) {
                osmd.EngravingRules.RenderGlissandi = true;
                console.log('✅ 已启用OSMD glissando渲染');
            } else {
                console.log('❌ OSMD不支持RenderGlissandi选项');
                console.log('🔍 检查替代选项: RenderGlissandos, DrawGlissando, etc.');

                // 检查可能的替代名称
                const glissandoAlternatives = ['RenderGlissandos', 'DrawGlissando', 'ShowGlissando'];
                glissandoAlternatives.forEach(alt => {
                    if (alt in osmd.EngravingRules) {
                        osmd.EngravingRules[alt] = true;
                        console.log(`✅ 找到并启用替代选项: ${alt}`);
                    }
                });
            }

            // 尝试启用所有可能相关的渲染选项
            const renderOptions = ['RenderSlurs', 'RenderArpeggios', 'RenderTies', 'RenderOrnaments', 'RenderArticulations'];
            renderOptions.forEach(option => {
                if (option in osmd.EngravingRules) {
                    osmd.EngravingRules[option] = true;
                    console.log(`✅ 已启用OSMD ${option}`);
                } else {
                    console.log(`❌ OSMD不支持${option}选项`);
                }
            });

            console.log('🔍 OSMD EngravingRules最终设置:');
            renderOptions.concat(['RenderGlissandi']).forEach(option => {
                if (option in osmd.EngravingRules) {
                    console.log(`  - ${option}: ${osmd.EngravingRules[option]}`);
                } else {
                    console.log(`  - ${option}: 不支持`);
                }
            });
        }

        // 隐藏标题和乐器名称
        if (osmd.EngravingRules) {
            osmd.EngravingRules.drawTitle = false;
            osmd.EngravingRules.drawSubtitle = false;
            osmd.EngravingRules.drawComposer = false;
            osmd.EngravingRules.drawLyricist = false;
            osmd.EngravingRules.drawCredits = false;
            osmd.EngravingRules.drawPartNames = false;
            console.log('✅ 已隐藏标题和乐器名称');
        }

        // 加载MusicXML
        console.log('🔄 准备加载MusicXML到OSMD...');
        console.log('📄 MusicXML验证 - 长度:', melodyData.musicXML.length);
        console.log('📄 MusicXML开头:', melodyData.musicXML.substring(0, 100));

        try {
            await osmd.load(melodyData.musicXML);
            console.log('✅ MusicXML加载成功');
        } catch (loadError) {
            console.error('❌ OSMD MusicXML加载失败:', loadError);
            console.error('📄 完整MusicXML内容:');
            console.error(melodyData.musicXML);
            throw new Error(`OSMD加载错误: ${loadError.message}`);
        }

          // 🔑 强力策略：同时使用多种方法确保多小节每行
        if (osmd.EngravingRules) {
            console.log('🎯 应用强力多小节布局...');

            // 第一层：设置系统小节数限制 - 手机端特殊处理
            // 注意：screenWidth已在函数开始处声明
            if (screenWidth <= 599) {
                // 手机端：严格控制换行位置
                console.log('🎯 手机端：严格换行控制策略');

                if (totalMeasures <= 4) {
                    // ≤4小节：强制单行显示，不换行
                    osmd.EngravingRules.MaxMeasuresPerSystem = totalMeasures;
                    osmd.EngravingRules.MinMeasuresPerSystem = totalMeasures;
                    if ("RenderXMeasuresPerLineAkaSystem" in osmd.EngravingRules) {
                        osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = totalMeasures;
                    }
                    console.log(`🎯 ≤4小节模式：${totalMeasures}小节强制单行，不允许换行`);
                } else {
                    // >4小节：严格4小节一行
                    osmd.EngravingRules.MaxMeasuresPerSystem = 4;
                    osmd.EngravingRules.MinMeasuresPerSystem = 4;
                    if ("RenderXMeasuresPerLineAkaSystem" in osmd.EngravingRules) {
                        osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = 4;
                    }
                    osmd.EngravingRules.CompactMode = true;
                    console.log(`🎯 >4小节模式：严格每行4小节，启用CompactMode + 额外缩放`);
                }
            } else {
                // 桌面端：同样严格控制换行位置
                console.log('🎯 桌面端：严格换行控制策略');

                if (totalMeasures <= 4) {
                    // ≤4小节：强制单行显示，不换行
                    osmd.EngravingRules.MaxMeasuresPerSystem = totalMeasures;
                    osmd.EngravingRules.MinMeasuresPerSystem = totalMeasures;
                    if ("RenderXMeasuresPerLineAkaSystem" in osmd.EngravingRules) {
                        osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = totalMeasures;
                    }
                    console.log(`🎯 ≤4小节模式：${totalMeasures}小节强制单行，不允许换行`);
                } else {
                    // >4小节：严格4小节一行
                    osmd.EngravingRules.MaxMeasuresPerSystem = 4;
                    osmd.EngravingRules.MinMeasuresPerSystem = 4;
                    if ("RenderXMeasuresPerLineAkaSystem" in osmd.EngravingRules) {
                        osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = 4;
                    }
                    osmd.EngravingRules.CompactMode = true;
                    console.log(`🎯 >4小节模式：严格每行4小节，启用CompactMode + 额外缩放`);
                }
            }

            // 第二层：启用MusicXML换行标记
            if ("NewSystemFromXMLNewSystemAttribute" in osmd.EngravingRules) {
                osmd.EngravingRules.NewSystemFromXMLNewSystemAttribute = true;  // 改为true以支持MusicXML换行
            }
            if ("NewSystemAtXMLNewSystemAttribute" in osmd.EngravingRules) {
                osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;  // 改为true以支持MusicXML换行
            }
            if ("NewSystemAtXMLNewSystem" in osmd.EngravingRules) {
                osmd.EngravingRules.NewSystemAtXMLNewSystem = true;  // 启用<print new-system="yes"/>标记
                console.log('✅ 启用NewSystemAtXMLNewSystem - 支持MusicXML换行标记');
            }

            // 第三层：设置合适的边距和间距 - 减小边距让乐谱更大
            // 自适应边距 - 手机端和横屏完全无留白
            // 注意：screenWidth和screenHeight已在上面声明，这里直接使用
            const isLandscape = screenWidth > screenHeight && screenHeight <= 599; // 横屏且是手机设备
            const isMobile = screenWidth <= 599 || isLandscape;

            if ("PageLeftMargin" in osmd.EngravingRules) {
                osmd.EngravingRules.PageLeftMargin = isMobile ? 1 : 6;
            }
            if ("PageRightMargin" in osmd.EngravingRules) {
                osmd.EngravingRules.PageRightMargin = isMobile ? 1 : 6;
            }
            if ("SystemLeftMargin" in osmd.EngravingRules) {
                osmd.EngravingRules.SystemLeftMargin = isMobile ? 0.5 : 6;
            }
            if ("SystemRightMargin" in osmd.EngravingRules) {
                osmd.EngravingRules.SystemRightMargin = isMobile ? 0.5 : 6;
            }

            // 手机端和横屏额外的适中边距设置
            if (isMobile) {
                console.log(`📱 ${isLandscape ? '横屏' : '手机'}边距优化：适中边距设置`);
                if ("PageTopMargin" in osmd.EngravingRules) {
                    osmd.EngravingRules.PageTopMargin = 0;
                }
                if ("PageBottomMargin" in osmd.EngravingRules) {
                    osmd.EngravingRules.PageBottomMargin = 0;
                }
                if ("TitleTopDistance" in osmd.EngravingRules) {
                    osmd.EngravingRules.TitleTopDistance = 0;
                }
                if ("TitleBottomDistance" in osmd.EngravingRules) {
                    osmd.EngravingRules.TitleBottomDistance = 0;
                }
                if ("SubtitleTopDistance" in osmd.EngravingRules) {
                    osmd.EngravingRules.SubtitleTopDistance = 0;
                }
            }

            // 第四层：调整小节间距
            if ("BetweenMeasuresDistance" in osmd.EngravingRules) {
                osmd.EngravingRules.BetweenMeasuresDistance = 15;
            }

            // 第五层：调整系统间距
            if ("SystemDistance" in osmd.EngravingRules) {
                osmd.EngravingRules.SystemDistance = 20;
            }

            // 第六层：让最后一行拉伸填满
            if ("StretchLastSystemLine" in osmd.EngravingRules) {
                osmd.EngravingRules.StretchLastSystemLine = true;
            }
            if ("JustifyLastSystem" in osmd.EngravingRules) {
                osmd.EngravingRules.JustifyLastSystem = true;
            }

            console.log(`✅ 强力布局配置:`);
            console.log(`   - 每行目标小节数: ${totalMeasures === 2 ? 2 : 4}`);
            console.log(`   - MinMeasuresPerSystem: ${osmd.EngravingRules.MinMeasuresPerSystem}`);
            console.log(`   - RenderXMeasuresPerLineAkaSystem: ${osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem}`);
        }
        // 设置适当的缩放 - 基于屏幕大小、方向和旋律长度自适应
        // 注意：screenWidth和screenHeight已在函数开始处声明，这里直接使用
        const isLandscape = screenWidth > screenHeight && screenHeight <= 599; // 横屏且是手机设备

        let zoom;
        if (isLandscape) {
            // 横屏模式：更大缩放，充分利用水平空间
            zoom = 0.7;
            console.log(`🔄 横屏自适应缩放: ${zoom} (宽${screenWidth}px 高${screenHeight}px)`);
        } else if (screenWidth <= 360) {
            zoom = 0.35;  // 极小屏幕 - 极度小型化旋律
        } else if (screenWidth <= 480) {
            zoom = 0.45;  // 超小屏幕 - 超小型化旋律
        } else if (screenWidth <= 599) {
            zoom = 0.55;  // 小屏幕 - 小型化旋律
        } else if (screenWidth <= 899) {
            zoom = 0.85;  // 中等屏幕 - 适中
        } else if (screenWidth <= 1200) {
            zoom = 1.4;   // 大屏幕 - 更大显示，充分利用空间
        } else {
            zoom = 1.6;   // 超大屏幕 - 最大显示
        }

        // 🎵 根据旋律长度进一步调整缩放 - 确保换行策略正确
        if (totalMeasures <= 4) {
            // ≤4小节：必须保证单行显示，适度限制缩放
            if (screenWidth > 899) {
                // 大屏幕上的4小节也需要控制缩放，避免过宽
                const maxSafeZoom = screenWidth <= 1200 ? 0.9 : 1.0; // 更保守的缩放，确保单行显示
                zoom = Math.min(zoom, maxSafeZoom);
                console.log(`🎯 4小节单行保护: 限制缩放至${zoom.toFixed(2)}，避免换行`);
            }
        } else {
            // >4小节：每4小节一行，允许更激进的缩放减少
            const lengthFactor = Math.max(0.6, 1 - (totalMeasures - 4) * 0.08); // 每超过4小节减少8%，最小60%
            zoom *= lengthFactor;
            console.log(`🎯 多行旋律调整: ${totalMeasures}小节 -> 缩放因子${lengthFactor.toFixed(2)} -> 最终缩放${zoom.toFixed(2)}`);
        }

        osmd.zoom = zoom;
        console.log(`🔍 最终自适应缩放: ${zoom.toFixed(2)} (屏幕宽度: ${screenWidth}px ${isLandscape ? '横屏' : '竖屏'}, 旋律${totalMeasures}小节)`);

        // 渲染
        osmd.render();
        console.log('✅ OSMD渲染完成');

        // 检查实际渲染结果
        setTimeout(() => {
            const svg = scoreDiv.querySelector('svg');
            if (svg) {
                const actualWidth = svg.getBBox ? svg.getBBox().width : svg.clientWidth;
                console.log(`📊 实际渲染宽度: ${Math.round(actualWidth)}px`);

                // 分析小节分布 - 使用正确的选择器
                const allG = svg.querySelectorAll('g');
                let measureGroups = [];

                allG.forEach(g => {
                    const id = g.getAttribute('id') || '';
                    const className = g.getAttribute('class') || '';

                    if (id.includes('MeasureContent') || className.includes('measure')) {
                        measureGroups.push(g);
                    }
                });

                console.log(`📏 渲染了${measureGroups.length}个小节`);

                if (measureGroups.length > 0) {
                    // 按Y坐标分组小节来检查布局
                    const rows = {};
                    measureGroups.forEach(g => {
                        const transform = g.getAttribute('transform') || '';
                        const parentTransform = g.parentElement?.getAttribute('transform') || '';

                        // 尝试从transform获取Y坐标
                        let y = 0;
                        const match = (transform + ' ' + parentTransform).match(/translate\([^,]+,\s*([^)]+)\)/);
                        if (match) {
                            y = Math.round(parseFloat(match[1]));
                        }

                        // 将Y坐标近似相同的小节分为一组（容差20px）
                        let foundRow = false;
                        for (let rowY in rows) {
                            if (Math.abs(y - parseFloat(rowY)) < 20) {
                                rows[rowY].push(g);
                                foundRow = true;
                                break;
                            }
                        }
                        if (!foundRow) {
                            rows[y] = [g];
                        }
                    });

                    // 报告每行的小节数
                    Object.keys(rows).sort((a, b) => parseFloat(a) - parseFloat(b)).forEach((y, index) => {
                        const count = rows[y].length;
                        console.log(`📍 第${index + 1}行: ${count} 个小节 ${count === 4 ? '✅' : count === 2 && totalMeasures === 2 ? '✅' : '❌'}`);
                    });
                }
            }
        }, 500);

        // 不再设置响应式监听器，保持固定4小节布局
    } catch (error) {
        console.error('❌ OSMD渲染失败:', error);
        scoreDiv.innerHTML = `
            <div style="color: red; padding: 50px; text-align: center;">
                <h3>渲染失败</h3>
                <p><strong>错误:</strong> ${error.message}</p>
                <p>请查看控制台了解详情</p>
            </div>
        `;
        throw error;
    }
}

/**
 * 设置响应式布局监听器
 */
function setupResponsiveLayout(melodyData) {
    // 移除旧的监听器（如果存在）
    if (window.responsiveResizeHandler) {
        window.removeEventListener('resize', window.responsiveResizeHandler);
    }

    // 防抖动函数，优化容器宽度检测
    let resizeTimeout;
    window.responsiveResizeHandler = function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(async () => {
            console.log('📱 屏幕尺寸变化，重新生成响应式布局');

            try {
                // 使用容器实际宽度而非窗口宽度
                const scoreContainer = document.getElementById('score');
                const containerWidth = scoreContainer ? scoreContainer.clientWidth : window.innerWidth;

                // 强制每行4小节（所有设备）
                const measuresPerLine = 4;

                console.log(`📱 响应式重构: 容器宽度=${containerWidth}px, 每行${measuresPerLine}小节`);

                const builder = new MusicXMLBuilder(melodyData.melody, melodyData.config);
                const newMusicXML = builder.build(measuresPerLine);

                // 重新渲染以应用新的小节分布
                if (osmd) {
                    await osmd.load(newMusicXML);

                    // 重新配置OSMD以匹配新的断点（使用原生API）
                    if (osmd.EngravingRules) {
                        // 重新计算小节宽度（每行固定4小节）
                        const availableWidth = containerWidth - 60;
                        const targetMeasureWidth = availableWidth / measuresPerLine;
                        const finalMeasureWidth = Math.max(40, Math.min(300, targetMeasureWidth)); // 最小40px适应小屏幕

                        console.log(`📱 响应式重配置: ${measuresPerLine}小节/行, 小节宽度=${Math.round(finalMeasureWidth)}px`);

                        // 更新固定小节配置
                        osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = measuresPerLine;
                        osmd.EngravingRules.MaxMeasuresPerSystem = measuresPerLine;
                        osmd.EngravingRules.MinMeasuresPerSystem = measuresPerLine;
                        osmd.EngravingRules.FixedMeasureWidth = true;
                        osmd.EngravingRules.FixedMeasureWidthFixedValue = finalMeasureWidth;
                        osmd.EngravingRules.NewSystemAtXMLNewSystem = true;

                        // 添加小节在系统内均匀分布的设置
                        if (osmd.EngravingRules.hasOwnProperty('JustifyMeasuresInSystem')) {
                            osmd.EngravingRules.JustifyMeasuresInSystem = true;
                        } else if (osmd.EngravingRules.hasOwnProperty('justifyMeasuresInSystem')) {
                            osmd.EngravingRules.justifyMeasuresInSystem = true;
                        }
                    }

                    osmd.render();
                    console.log('✅ 响应式重新渲染完成 - 应用新的小节分布');
                }
            } catch (error) {
                console.error('❌ 响应式重新渲染失败:', error);
            }
        }, 250); // 稍微减少防抖时间以提高响应性
    };

    window.addEventListener('resize', window.responsiveResizeHandler);
    console.log('📱 响应式布局监听器已设置');
}

/**
 * 显示不同小节数的布局效果预期
 */
function showLayoutExpectation(totalMeasures) {
    console.log(`🎼 布局效果预期 (${totalMeasures}小节):`);

    if (totalMeasures <= 4) {
        console.log(`  📏 单行布局: ${totalMeasures}小节等距分布，充满容器宽度`);
        console.log(`  🎯 预期效果: 小节间距均匀，无右侧空白`);
    } else {
        const fullLines = Math.floor(totalMeasures / 4);
        const remainingMeasures = totalMeasures % 4;

        console.log(`  📄 多行布局:`);
        for (let i = 1; i <= fullLines; i++) {
            console.log(`    第${i}行: 4小节，充满容器宽度`);
        }

        if (remainingMeasures > 0) {
            console.log(`    第${fullLines + 1}行: ${remainingMeasures}小节，等距分布充满容器宽度`);
        }

        console.log(`  🎯 预期效果: 每行都充满容器，无宽度不一致问题`);
    }

    // 显示具体的用例说明
    console.log(`\n📝 纯间距布局说明 (音符保持原形):`);
    console.log(`  2小节 → 第1行: 2小节，通过增加间距填满容器`);
    console.log(`  4小节 → 第1行: 4小节，通过调整间距填满容器`);
    console.log(`  8小节 → 第1行: 4小节，第2行: 4小节，每行通过间距填满容器`);
    console.log(`  10小节 → 3行布局，前两行各4小节，最后一行2小节通过间距填满`);
    console.log(`  ✅ 保证: 音符、拍号、谱号绝不变形，只调整小节和音符间距`);
    console.log(`  🚫 禁止: 任何CSS transform缩放或元素变形`);
}

/**
 * 严格验证小节布局：确保没有行超过指定的最大小节数
 */
function validateStrictMeasureLayout(maxMeasuresPerLine) {
    console.log(`🔍 严格验证布局: 检查是否有行超过${maxMeasuresPerLine}小节`);

    const scoreDiv = document.getElementById('score');
    if (!scoreDiv) return;

    const svg = scoreDiv.querySelector('svg');
    if (!svg) return;

    try {
        // 查找所有系统（行）
        const systems = svg.querySelectorAll('g[class*="system"], g.system, g[id*="system"]');

        if (systems.length > 0) {
            console.log(`📊 找到${systems.length}个系统（行）`);

            let hasViolation = false;
            systems.forEach((system, index) => {
                const measures = system.querySelectorAll('g[id*="measure"], g.measure, g[class*="measure"]');
                const measureCount = measures.length;

                console.log(`  行${index + 1}: ${measureCount}个小节`);

                if (measureCount > maxMeasuresPerLine) {
                    console.error(`❌ 违规！行${index + 1}包含${measureCount}个小节，超过限制的${maxMeasuresPerLine}个`);
                    hasViolation = true;
                } else if (measureCount === maxMeasuresPerLine) {
                    console.log(`✅ 行${index + 1}正好${measureCount}个小节，符合要求`);
                } else if (measureCount < maxMeasuresPerLine) {
                    console.log(`⚡ 行${index + 1}只有${measureCount}个小节，可能是最后一行`);
                }
            });

            if (!hasViolation) {
                console.log(`✅ 严格验证通过：所有行都不超过${maxMeasuresPerLine}小节`);
            }
        } else {
            console.warn('⚠️ 未找到系统元素，尝试其他方法检测小节布局');

            // 备用方法：通过小节的Y坐标分组
            const measures = svg.querySelectorAll('g[id*="measure"], g.measure, g[class*="measure"]');
            if (measures.length > 0) {
                console.log(`📊 找到${measures.length}个小节，按Y坐标分组`);

                const measuresByY = new Map();
                measures.forEach(measure => {
                    const transform = measure.getAttribute('transform') || '';
                    const translateMatch = transform.match(/translate\([^,]+,\s*([^)]+)\)/);
                    const y = translateMatch ? parseFloat(translateMatch[1]) : 0;

                    const yKey = Math.round(y / 10) * 10; // 按10px为单位分组
                    if (!measuresByY.has(yKey)) {
                        measuresByY.set(yKey, []);
                    }
                    measuresByY.get(yKey).push(measure);
                });

                let hasViolation = false;
                let lineIndex = 0;
                measuresByY.forEach((lineMeasures, y) => {
                    lineIndex++;
                    const measureCount = lineMeasures.length;
                    console.log(`  行${lineIndex} (Y=${y}): ${measureCount}个小节`);

                    if (measureCount > maxMeasuresPerLine) {
                        console.error(`❌ 违规！行${lineIndex}包含${measureCount}个小节，超过限制的${maxMeasuresPerLine}个`);
                        hasViolation = true;
                    }
                });

                if (!hasViolation) {
                    console.log(`✅ 严格验证通过：所有行都不超过${maxMeasuresPerLine}小节`);
                }
            }
        }
    } catch (error) {
        console.error('❌ 严格布局验证失败:', error);
    }
}

/**
 * 获取当前响应式布局信息（用于调试）
 */
function getCurrentResponsiveLayout() {
    const scoreContainer = document.getElementById('score');
    if (!scoreContainer) return null;

    const containerWidth = scoreContainer.clientWidth;
    let layoutType, measuresPerLine;

    if (containerWidth >= 900) {
        layoutType = 'desktop';
        measuresPerLine = 4;
    } else if (containerWidth >= 600) {
        layoutType = 'tablet';
        measuresPerLine = 2;
    } else {
        layoutType = 'mobile';
        measuresPerLine = 1;
    }

    return {
        containerWidth,
        layoutType,
        measuresPerLine,
        breakpoints: {
            desktop: '≥900px',
            tablet: '600px-899px',
            mobile: '<600px'
        }
    };
}

/**
 * 分析最终布局结果
 */
function analyzeLayout(expectedMeasuresPerLine) {
    setTimeout(() => {
        const scoreDiv = document.getElementById('score');
        if (!scoreDiv) return;

        const svg = scoreDiv.querySelector('svg');
        if (!svg) return;

        console.log('🔍 分析最终布局结果:');

        // 查找所有可能的系统元素
        const possibleSelectors = [
            'g[id*="system"]',
            'g.system',
            'g[id*="System"]',
            'g[class*="system"]'
        ];

        let systems = [];
        for (const selector of possibleSelectors) {
            systems = svg.querySelectorAll(selector);
            if (systems.length > 0) {
                console.log(`✅ 找到${systems.length}个系统，使用选择器: ${selector}`);
                break;
            }
        }

        if (systems.length > 0) {
            systems.forEach((system, index) => {
                const measures = system.querySelectorAll('*[id*="measure"], *[class*="measure"]');
                const measureCount = measures.length;
                console.log(`  行${index + 1}: ${measureCount}个小节 ${measureCount > expectedMeasuresPerLine ? '❌ 超出限制' : '✅ 符合要求'}`);
            });
        } else {
            console.log('⚠️ 无法找到系统元素，尝试其他方法分析...');
            // 备用分析方法
            const allMeasures = svg.querySelectorAll('*[id*="measure"]');
            console.log(`总共找到 ${allMeasures.length} 个小节元素`);
        }
    }, 300);
}

/**
 * 直接操作DOM来实现自定义布局
 */
function applyCustomLayout(maxMeasuresPerLine) {
    console.log(`🎨 应用自定义布局检查: 每行最多${maxMeasuresPerLine}小节`);

    try {
        // 等待DOM更新
        setTimeout(() => {
            const scoreDiv = document.getElementById('score');
            if (!scoreDiv) return;

            // 分析SVG结构来理解OSMD的布局
            const svg = scoreDiv.querySelector('svg');
            if (svg) {
                console.log(`📊 SVG尺寸: ${svg.getAttribute('width')} x ${svg.getAttribute('height')}`);

                // 查找系统（行）元素
                const systems = svg.querySelectorAll('g[id*="system"], g.system');
                console.log(`🎼 找到${systems.length}个系统/行`);

                if (systems.length > 0) {
                    systems.forEach((system, index) => {
                        const measures = system.querySelectorAll('g[id*="measure"], g.measure');
                        console.log(`  系统${index + 1}: ${measures.length}个小节`);

                        // 如果某个系统的小节数超过maxMeasuresPerLine，记录警告
                        if (measures.length > maxMeasuresPerLine) {
                            console.warn(`⚠️ 系统${index + 1}包含${measures.length}个小节，超过限制的${maxMeasuresPerLine}个`);
                        }
                    });
                } else {
                    // 备选方案：直接查找所有小节
                    const allMeasures = svg.querySelectorAll('*[id*="measure"]');
                    console.log(`🔍 找到${allMeasures.length}个可能的小节元素`);

                    // 分析前几个元素
                    for (let i = 0; i < Math.min(5, allMeasures.length); i++) {
                        const measure = allMeasures[i];
                        console.log(`  小节${i + 1}: id="${measure.id}", tag="${measure.tagName}", y="${measure.getAttribute('transform')}"`);
                    }
                }

                // 强制重新检查OSMD内部状态
                if (window.osmd && window.osmd.EngravingRules) {
                    console.log(`🔧 当前OSMD设置检查:`);
                    console.log(`  - MaxMeasuresPerSystem: ${window.osmd.EngravingRules.MaxMeasuresPerSystem}`);
                    console.log(`  - MinMeasuresPerSystem: ${window.osmd.EngravingRules.MinMeasuresPerSystem}`);
                }
            }
        }, 200); // 增加延迟以确保渲染完成
    } catch (error) {
        console.error('❌ 自定义布局分析失败:', error);
    }
}

// 导出增强函数（如果需要）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ...module.exports,
        initOSMD,
        renderScore,
        setupResponsiveLayout,
        showLayoutExpectation,
        validateStrictMeasureLayout,
        getCurrentResponsiveLayout,
        analyzeLayout,
        applyCustomLayout
    };
}

// 全局可用
window.initOSMD = initOSMD;
window.renderScore = renderScore;
window.setupResponsiveLayout = setupResponsiveLayout;
window.showLayoutExpectation = showLayoutExpectation;
window.validateStrictMeasureLayout = validateStrictMeasureLayout;
window.getCurrentResponsiveLayout = getCurrentResponsiveLayout;
window.analyzeLayout = analyzeLayout;
window.applyCustomLayout = applyCustomLayout;

console.log('✅ 增强OSMD渲染系统已加载到interval-renderer.js');