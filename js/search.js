// 搜索功能实现
let searchIndex = null;
let lunrIndex = null;
let searchData = null;

// 初始化搜索
async function initSearch() {
    try {
        const response = await fetch('/index.json');
        searchData = await response.json();
        console.log('搜索数据已加载，共', searchData.length, '条记录');
        console.log('示例数据:', searchData.slice(0, 2));
    } catch (error) {
        console.error('搜索数据加载失败:', error);
    }
}

// 执行搜索
function performSearch(query) {
    if (!searchData || !query.trim()) {
        return [];
    }

    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(term => term.length > 0);

    // 高级搜索算法，计算相关性评分
    const results = searchData.map(item => {
        let score = 0;
        let matchedFields = [];

        // 构建搜索字段
        const fields = {
            title: item.title || '',
            content: item.content || '',
            summary: item.summary || '',
            description: item.description || '',
            tags: Array.isArray(item.tags) ? item.tags.join(' ') : '',
            categories: Array.isArray(item.categories) ? item.categories.join(' ') : ''
        };

        // 为每个字段设置不同的权重
        const weights = {
            title: 5,      // 标题最重要
            tags: 4,       // 标签很重要
            summary: 3,    // 摘要重要
            description: 3,// 描述重要
            categories: 2, // 分类次要
            content: 1     // 内容基础分
        };

        // 对每个搜索词进行匹配
        queryTerms.forEach(term => {
            Object.entries(fields).forEach(([fieldName, fieldValue]) => {
                const fieldLower = fieldValue.toLowerCase();

                if (fieldLower.includes(term)) {
                    // 精确匹配加分更多
                    const exactMatch = fieldLower === term;
                    const wordMatch = fieldLower.split(/\s+/).includes(term);

                    let fieldScore = weights[fieldName];

                    if (exactMatch) {
                        fieldScore *= 3;
                    } else if (wordMatch) {
                        fieldScore *= 2;
                    }

                    // 标题开头匹配额外加分
                    if (fieldName === 'title' && fieldLower.startsWith(term)) {
                        fieldScore *= 1.5;
                    }

                    score += fieldScore;

                    if (!matchedFields.includes(fieldName)) {
                        matchedFields.push(fieldName);
                    }
                }
            });
        });

        // 多字段匹配奖励
        if (matchedFields.length > 1) {
            score *= (1 + matchedFields.length * 0.1);
        }

        // 完全匹配所有查询词的奖励
        const allTermsMatch = queryTerms.every(term =>
            Object.values(fields).some(field =>
                field.toLowerCase().includes(term)
            )
        );

        if (allTermsMatch) {
            score *= 1.2;
        }

        return {
            ...item,
            score: score,
            matchedFields: matchedFields
        };
    }).filter(item => item.score > 0);

    // 按评分排序，评分高的在前
    return results.sort((a, b) => b.score - a.score);
}

// 高亮匹配的关键词
function highlightMatch(text, query) {
    if (!text || !query) return text;

    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    let highlightedText = text;

    queryTerms.forEach(term => {
        const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark style="background: linear-gradient(120deg, #ffd700 0%, #ffed4a 100%); color: #2d3748; padding: 1px 2px; border-radius: 3px; font-weight: 600;">$1</mark>');
    });

    return highlightedText;
}

// 创建内容摘要（带高亮的上下文）
function createContextSnippet(content, query, maxLength = 150) {
    if (!content || !query) return content.substring(0, maxLength) + '...';

    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    let bestSnippet = '';
    let maxMatches = 0;

    // 寻找包含最多关键词的文本段落
    const contentLower = content.toLowerCase();
    const words = content.split(/\s+/);

    for (let i = 0; i < words.length - 20; i++) {
        const snippet = words.slice(i, i + 25).join(' ');
        const snippetLower = snippet.toLowerCase();

        const matches = queryTerms.filter(term => snippetLower.includes(term)).length;

        if (matches > maxMatches) {
            maxMatches = matches;
            bestSnippet = snippet;
        }
    }

    // 如果没有找到好的片段，使用开头
    if (!bestSnippet) {
        bestSnippet = content.substring(0, maxLength);
    }

    if (bestSnippet.length > maxLength) {
        bestSnippet = bestSnippet.substring(0, maxLength) + '...';
    }

    return highlightMatch(bestSnippet, query);
}

// 显示搜索结果
function displaySearchResults(results, query) {
    let resultsContainer = document.getElementById('search-results');
    
    // 如果没有结果容器，创建一个
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'search-results';
        resultsContainer.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            margin-top: 12px;
            max-height: 384px;
            overflow-y: auto;
            z-index: 999;
            background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
            border-radius: 16px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
            border: 2px solid #e6edff;
            backdrop-filter: blur(10px);
            display: none;
        `;
        // 添加到搜索框的父容器而不是form内部
        document.getElementById('search-bar').appendChild(resultsContainer);
    }
    
    if (results.length === 0) {
        const suggestions = ['视奏', '音乐', '吉他', 'Cognote', '教学'];
        const randomSuggestions = suggestions.sort(() => 0.5 - Math.random()).slice(0, 3);

        resultsContainer.innerHTML = `
            <div style="padding: 28px; text-align: center; color: #718096; font-size: 14px;">
                <div style="font-size: 42px; margin-bottom: 16px; opacity: 0.6;">🔍</div>
                <div style="font-weight: 600; margin-bottom: 8px; color: #4a5568; font-size: 16px;">未找到 "${highlightMatch(query, query)}" 相关内容</div>
                <div style="opacity: 0.8; margin-bottom: 16px;">试试以下搜索建议：</div>
                <div style="display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;">
                    ${randomSuggestions.map(suggestion =>
                        `<span style="background: #e6edff; color: #667eea; padding: 4px 8px; border-radius: 12px; font-size: 12px; cursor: pointer;" onclick="document.querySelector('#search input').value='${suggestion}'; document.querySelector('#search input').dispatchEvent(new Event('input'));">${suggestion}</span>`
                    ).join('')}
                </div>
            </div>
        `;
        resultsContainer.style.display = 'block';
        return;
    }
    
    const resultHTML = results.slice(0, 8).map((result, index) => {
        // 创建标签显示
        const tags = Array.isArray(result.tags) && result.tags.length > 0
            ? result.tags.slice(0, 3).map(tag =>
                `<span style="background: #e6edff; color: #667eea; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-right: 4px;">${highlightMatch(tag, query)}</span>`
              ).join('')
            : '';

        // 创建高亮的标题
        const highlightedTitle = highlightMatch(result.title, query);

        // 创建智能摘要（优先显示包含关键词的内容）
        const snippet = createContextSnippet(result.content || result.summary || '', query, 140);

        // 显示匹配的字段信息
        const matchInfo = result.matchedFields && result.matchedFields.length > 0
            ? `<span style="font-size: 10px; color: #a0aec0;">匹配: ${result.matchedFields.join(', ')}</span>`
            : '';

        // 相关性评分显示（开发模式可见）
        const scoreInfo = result.score
            ? `<span style="font-size: 10px; color: #cbd5e0; margin-left: 8px;">评分: ${Math.round(result.score)}</span>`
            : '';

        return `
        <a href="${result.href}"
           style="
               display: block;
               padding: 16px 20px;
               text-decoration: none;
               transition: all 0.3s ease;
               border-bottom: ${index === results.slice(0, 8).length - 1 ? 'none' : '1px solid rgba(230, 237, 255, 0.5)'};
           "
           onmouseover="this.style.background='linear-gradient(135deg, #f0f4ff 0%, #e6edff 100%)'; this.style.transform='translateY(-1px)'"
           onmouseout="this.style.background='transparent'; this.style.transform='translateY(0)'">
            <div style="
                font-weight: 600;
                color: #2d3748;
                margin-bottom: 6px;
                font-size: 15px;
                line-height: 1.4;
            ">${highlightedTitle}</div>
            <div style="
                font-size: 12px;
                color: #667eea;
                margin-bottom: 8px;
                font-weight: 500;
                display: flex;
                align-items: center;
                justify-content: space-between;
            ">
                <span style="text-transform: uppercase; letter-spacing: 0.5px;">${result.type || '文章'} • ${result.date || '最近'}</span>
                <span>${matchInfo}${scoreInfo}</span>
            </div>
            ${tags ? `<div style="margin-bottom: 8px;">${tags}</div>` : ''}
            <div style="
                font-size: 13px;
                color: #718096;
                line-height: 1.5;
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
            ">${snippet}</div>
        </a>
        `;
    }).join('');

    // 添加搜索统计信息
    const searchStats = `
        <div style="
            padding: 12px 20px;
            background: linear-gradient(135deg, #f8f9ff 0%, #e6edff 100%);
            border-bottom: 1px solid rgba(230, 237, 255, 0.8);
            font-size: 12px;
            color: #667eea;
            font-weight: 500;
        ">
            找到 <strong>${results.length}</strong> 个相关结果，搜索用时 <strong>${Date.now() - (window.searchStartTime || Date.now())}ms</strong>
        </div>
    `;

    resultsContainer.innerHTML = searchStats + resultHTML;
    resultsContainer.style.display = 'block';
}

// 隐藏搜索结果
function hideSearchResults() {
    const resultsContainer = document.getElementById('search-results');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
        // 清除所有选中状态
        const results = resultsContainer.querySelectorAll('a');
        results.forEach(result => {
            result.dataset.selected = 'false';
            result.style.background = 'transparent';
            result.style.transform = 'translateY(0)';
        });
    }
}

// 初始化搜索事件监听器
function initSearchEventListeners() {
    const searchForm = document.getElementById('search');
    const searchInput = searchForm.querySelector('input[type="text"]');
    const searchButton = searchForm.querySelector('button');
    
    // 更新占位符文本
    searchInput.placeholder = '搜索文章内容...';
    
    let searchTimeout;
    
    // 输入时实时搜索
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            hideSearchResults();
            return;
        }
        
        searchTimeout = setTimeout(() => {
            window.searchStartTime = Date.now();
            const results = performSearch(query);
            displaySearchResults(results, query);
        }, 300);
    });
    
    // 表单提交处理
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query.length >= 2) {
            window.searchStartTime = Date.now();
            const results = performSearch(query);
            displaySearchResults(results, query);
        }
    });
    
    // 点击其他地方隐藏结果
    document.addEventListener('click', (e) => {
        const searchBar = document.getElementById('search-bar');
        if (!searchBar.contains(e.target)) {
            hideSearchResults();
        }
    });
    
    // 键盘导航支持
    searchInput.addEventListener('keydown', (e) => {
        const resultsContainer = document.getElementById('search-results');
        if (!resultsContainer || resultsContainer.style.display === 'none') return;
        
        const results = resultsContainer.querySelectorAll('a');
        let currentIndex = Array.from(results).findIndex(a => a.dataset.selected === 'true');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (currentIndex >= 0) {
                results[currentIndex].dataset.selected = 'false';
                results[currentIndex].style.background = 'transparent';
                results[currentIndex].style.transform = 'translateY(0)';
            }
            currentIndex = (currentIndex + 1) % results.length;
            results[currentIndex].dataset.selected = 'true';
            results[currentIndex].style.background = 'linear-gradient(135deg, #e6edff 0%, #d4e6ff 100%)';
            results[currentIndex].style.transform = 'translateY(-1px)';
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentIndex >= 0) {
                results[currentIndex].dataset.selected = 'false';
                results[currentIndex].style.background = 'transparent';
                results[currentIndex].style.transform = 'translateY(0)';
            }
            currentIndex = currentIndex <= 0 ? results.length - 1 : currentIndex - 1;
            results[currentIndex].dataset.selected = 'true';
            results[currentIndex].style.background = 'linear-gradient(135deg, #e6edff 0%, #d4e6ff 100%)';
            results[currentIndex].style.transform = 'translateY(-1px)';
        } else if (e.key === 'Enter' && currentIndex >= 0) {
            e.preventDefault();
            results[currentIndex].click();
        }
    });
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initSearch();
    initSearchEventListeners();
});