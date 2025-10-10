/**
 * 和弦显示监控工具
 *
 * 实时显示五线谱上的和弦信息：
 * - 小节数
 * - 和弦代号（实际显示的）
 * - 具体音符（从低到高）
 * - MIDI值
 *
 * 创建时间: 2025-10-02
 */

/**
 * 创建监控面板UI
 */
function createMonitorPanel() {
    // 检查是否已存在
    let panel = document.getElementById('chordMonitorPanel');
    if (panel) {
        panel.remove();
    }

    // 创建面板
    panel = document.createElement('div');
    panel.id = 'chordMonitorPanel';
    panel.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        width: 600px;
        max-height: 80vh;
        background: white;
        border: 2px solid #333;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
    `;

    // 标题栏
    const header = document.createElement('div');
    header.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 12px 16px;
        font-weight: 600;
        font-size: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    header.innerHTML = `
        <span>🎵 和弦监控面板</span>
        <button onclick="closeMonitorPanel()" style="
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        ">关闭</button>
    `;

    // 内容区域
    const content = document.createElement('div');
    content.id = 'monitorContent';
    content.style.cssText = `
        flex: 1;
        overflow-y: auto;
        padding: 16px;
    `;

    panel.appendChild(header);
    panel.appendChild(content);
    document.body.appendChild(panel);

    return panel;
}

/**
 * 关闭监控面板
 */
function closeMonitorPanel() {
    const panel = document.getElementById('chordMonitorPanel');
    if (panel) {
        panel.remove();
    }
}

/**
 * 从生成的和弦数据中提取信息
 */
function extractChordData() {
    console.log('🔍 开始提取和弦数据...');

    // 尝试从全局变量获取
    let chordsData = null;

    if (typeof window.lastGeneratedChords !== 'undefined') {
        chordsData = window.lastGeneratedChords;
        console.log('✅ 从 window.lastGeneratedChords 获取数据');
    } else if (typeof window.currentChordProgression !== 'undefined') {
        chordsData = window.currentChordProgression;
        console.log('✅ 从 window.currentChordProgression 获取数据');
    } else {
        console.warn('⚠️ 未找到全局和弦数据变量');
        return null;
    }

    if (!chordsData || !chordsData.progression) {
        console.warn('⚠️ 和弦数据格式不正确');
        return null;
    }

    console.log(`✅ 找到 ${chordsData.progression.length} 个和弦`);
    return chordsData;
}

/**
 * 从DOM中提取实际显示的和弦代号
 */
function extractDisplayedChordSymbols() {
    console.log('🔍 从DOM提取和弦代号...');

    const scoreDiv = document.getElementById('score');
    if (!scoreDiv) {
        console.warn('⚠️ 找不到score元素');
        return [];
    }

    const svg = scoreDiv.querySelector('svg');
    if (!svg) {
        console.warn('⚠️ 找不到SVG元素');
        return [];
    }

    // 查找所有和弦代号文本
    // OSMD通常将和弦代号渲染为text元素
    const textElements = svg.querySelectorAll('text');
    const chordSymbols = [];

    textElements.forEach(text => {
        const content = text.textContent.trim();
        // 过滤掉非和弦代号的文本（数字、空白等）
        if (content &&
            content.length > 0 &&
            !content.match(/^[\d\s\.]+$/) &&  // 不是纯数字
            !content.match(/^[♯♭♮]+$/)        // 不是单独的变音记号
        ) {
            chordSymbols.push({
                text: content,
                x: parseFloat(text.getAttribute('x')) || 0,
                y: parseFloat(text.getAttribute('y')) || 0
            });
        }
    });

    // 按x坐标排序（从左到右）
    chordSymbols.sort((a, b) => a.x - a.x);

    console.log(`✅ 找到 ${chordSymbols.length} 个和弦代号: ${chordSymbols.map(c => c.text).join(', ')}`);
    return chordSymbols.map(c => c.text);
}

/**
 * 生成监控表格HTML
 */
function generateMonitorTable(chordsData, displayedSymbols) {
    if (!chordsData || !chordsData.progression) {
        return '<p style="color: #999; text-align: center; padding: 20px;">暂无和弦数据</p>';
    }

    const progression = chordsData.progression;

    let html = `
        <div style="margin-bottom: 16px; padding: 12px; background: #f5f5f5; border-radius: 6px;">
            <strong>统计信息：</strong><br>
            总小节数: ${progression.length}<br>
            和弦代号数量: ${displayedSymbols.length}
        </div>
        <div style="overflow-x: auto;">
            <table style="
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
                background: white;
            ">
                <thead>
                    <tr style="background: #f8f9fa;">
                        <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">小节</th>
                        <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">显示代号</th>
                        <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">音符（低→高）</th>
                        <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">MIDI值</th>
                        <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">内部数据</th>
                    </tr>
                </thead>
                <tbody>
    `;

    progression.forEach((chord, index) => {
        const measureNum = index + 1;
        const displayedSymbol = displayedSymbols[index] || '❌ 未显示';

        // 提取音符信息
        let notes = '未知';
        let midiNotes = '未知';
        let internalData = '';

        if (chord.notes && Array.isArray(chord.notes)) {
            notes = chord.notes.join('-');
        }

        if (chord.midiNotes && Array.isArray(chord.midiNotes)) {
            midiNotes = chord.midiNotes.join(', ');
        }

        // 内部数据
        if (chord.root) {
            internalData += `根音: ${chord.root}<br>`;
        }
        if (chord.type) {
            internalData += `类型: ${chord.type}<br>`;
        }
        if (chord.inversion !== undefined) {
            internalData += `转位: ${chord.inversion}`;
        }

        // 检查是否匹配
        const expectedSymbol = chord.symbol || `${chord.root}${chord.type || ''}`;
        const isMatch = displayedSymbol === expectedSymbol ||
                       displayedSymbol.startsWith(expectedSymbol);
        const matchIcon = isMatch ? '✅' : '⚠️';

        const rowStyle = isMatch ? '' : 'background: #fff3cd;';

        html += `
            <tr style="${rowStyle}">
                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: 600;">${measureNum}</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">
                    <span style="font-weight: 600; color: #667eea;">${displayedSymbol}</span>
                    ${matchIcon}
                </td>
                <td style="padding: 8px; border: 1px solid #dee2e6; font-family: monospace;">
                    ${notes}
                </td>
                <td style="padding: 8px; border: 1px solid #dee2e6; font-family: monospace; font-size: 11px;">
                    ${midiNotes}
                </td>
                <td style="padding: 8px; border: 1px solid #dee2e6; font-size: 11px; line-height: 1.6;">
                    ${internalData || '无'}
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    return html;
}

/**
 * 更新监控面板
 */
function updateMonitorPanel() {
    console.log('\n🔄 更新监控面板...');

    const content = document.getElementById('monitorContent');
    if (!content) {
        console.warn('⚠️ 监控面板未打开');
        return;
    }

    // 提取数据
    const chordsData = extractChordData();
    const displayedSymbols = extractDisplayedChordSymbols();

    // 生成表格
    const tableHTML = generateMonitorTable(chordsData, displayedSymbols);
    content.innerHTML = tableHTML;

    console.log('✅ 监控面板已更新');
}

/**
 * 打开监控面板并显示当前和弦信息
 */
function showChordMonitor() {
    console.log('\n🎵 ========== 打开和弦监控面板 ==========\n');

    // 创建面板
    createMonitorPanel();

    // 稍微延迟以确保面板已渲染
    setTimeout(() => {
        updateMonitorPanel();
    }, 100);
}

/**
 * 自动监控：在和弦生成后自动更新
 */
function enableAutoMonitor() {
    console.log('🔄 启用自动监控模式');

    // 监听和弦生成事件（如果有）
    // 或者定期更新
    setInterval(() => {
        const panel = document.getElementById('chordMonitorPanel');
        if (panel) {
            updateMonitorPanel();
        }
    }, 2000);  // 每2秒更新一次
}

/**
 * 手动刷新监控数据
 */
function refreshMonitor() {
    console.log('🔄 手动刷新监控数据');
    updateMonitorPanel();
}

/**
 * 导出数据到控制台（详细版）
 */
function exportMonitorData() {
    console.log('\n📊 ========== 详细和弦数据导出 ==========\n');

    const chordsData = extractChordData();
    const displayedSymbols = extractDisplayedChordSymbols();

    if (!chordsData) {
        console.error('❌ 无和弦数据');
        return;
    }

    console.log('📋 和弦进行数据:');
    console.table(chordsData.progression.map((chord, i) => ({
        小节: i + 1,
        显示代号: displayedSymbols[i] || '❌',
        音符: chord.notes?.join('-') || '?',
        根音: chord.root || '?',
        类型: chord.type || '?',
        转位: chord.inversion ?? '?',
        MIDI: chord.midiNotes?.join(', ') || '?'
    })));

    console.log('\n✅ 数据已导出到控制台');
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.showChordMonitor = showChordMonitor;
    window.closeMonitorPanel = closeMonitorPanel;
    window.updateMonitorPanel = updateMonitorPanel;
    window.refreshMonitor = refreshMonitor;
    window.exportMonitorData = exportMonitorData;
    window.enableAutoMonitor = enableAutoMonitor;

    console.log('✅ 和弦监控工具已加载');
    console.log('📝 可用函数:');
    console.log('  - showChordMonitor() - 打开监控面板');
    console.log('  - refreshMonitor() - 刷新监控数据');
    console.log('  - exportMonitorData() - 导出数据到控制台');
    console.log('  - enableAutoMonitor() - 启用自动监控（每2秒更新）');
    console.log('');
    console.log('💡 快速开始：运行 showChordMonitor()');
}
