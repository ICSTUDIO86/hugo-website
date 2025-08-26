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
    
    // 简单的字符串匹配搜索，支持中文
    const results = searchData.filter(item => {
        const searchFields = [
            item.title || '',
            item.content || '',
            item.summary || ''
        ].join(' ').toLowerCase();
        
        return searchFields.includes(query.toLowerCase());
    });
    
    // 按相关度排序（标题匹配优先）
    return results.sort((a, b) => {
        const aTitle = (a.title || '').toLowerCase();
        const bTitle = (b.title || '').toLowerCase();
        const queryLower = query.toLowerCase();
        
        if (aTitle.includes(queryLower) && !bTitle.includes(queryLower)) return -1;
        if (!aTitle.includes(queryLower) && bTitle.includes(queryLower)) return 1;
        return 0;
    });
}

// 显示搜索结果
function displaySearchResults(results, query) {
    let resultsContainer = document.getElementById('search-results');
    
    // 如果没有结果容器，创建一个
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'search-results';
        resultsContainer.className = 'absolute top-full left-0 right-0 bg-white border border-zinc-200 rounded-lg shadow-lg mt-1 max-h-96 overflow-y-auto z-50';
        document.getElementById('search').appendChild(resultsContainer);
    }
    
    if (results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="p-4 text-gray-500 text-center">
                未找到与"${query}"相关的结果
            </div>
        `;
        resultsContainer.style.display = 'block';
        return;
    }
    
    const resultHTML = results.slice(0, 8).map(result => `
        <a href="${result.href}" class="block p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <div class="font-semibold text-gray-800 mb-1">${result.title}</div>
            <div class="text-sm text-gray-600 mb-1">${result.type} • ${result.date}</div>
            <div class="text-sm text-gray-500 line-clamp-2">${result.summary || result.content.substring(0, 150)}...</div>
        </a>
    `).join('');
    
    resultsContainer.innerHTML = resultHTML;
    resultsContainer.style.display = 'block';
}

// 隐藏搜索结果
function hideSearchResults() {
    const resultsContainer = document.getElementById('search-results');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
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
            const results = performSearch(query);
            displaySearchResults(results, query);
        }, 300);
    });
    
    // 表单提交处理
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query.length >= 2) {
            const results = performSearch(query);
            displaySearchResults(results, query);
        }
    });
    
    // 点击其他地方隐藏结果
    document.addEventListener('click', (e) => {
        if (!searchForm.contains(e.target)) {
            hideSearchResults();
        }
    });
    
    // 键盘导航支持
    searchInput.addEventListener('keydown', (e) => {
        const resultsContainer = document.getElementById('search-results');
        if (!resultsContainer || resultsContainer.style.display === 'none') return;
        
        const results = resultsContainer.querySelectorAll('a');
        let currentIndex = Array.from(results).findIndex(a => a.classList.contains('bg-blue-50'));
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (currentIndex >= 0) results[currentIndex].classList.remove('bg-blue-50');
            currentIndex = (currentIndex + 1) % results.length;
            results[currentIndex].classList.add('bg-blue-50');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentIndex >= 0) results[currentIndex].classList.remove('bg-blue-50');
            currentIndex = currentIndex <= 0 ? results.length - 1 : currentIndex - 1;
            results[currentIndex].classList.add('bg-blue-50');
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