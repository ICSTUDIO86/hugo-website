/**
 * 音乐内容主题过滤器
 * 支持 URL 参数 + 客户端过滤的混合方案
 */

(function() {
  'use strict';

  // 获取 DOM 元素
  const filterSelect = document.getElementById('topic-filter');
  const articleList = document.getElementById('article-list');

  if (!filterSelect || !articleList) {
    return; // 如果元素不存在，直接退出
  }

  const articles = articleList.querySelectorAll('.article-item');

  /**
   * 从 URL 中获取 topic 参数
   */
  function getTopicFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('topic') || '';
  }

  /**
   * 更新 URL 参数（不刷新页面）
   */
  function updateURL(topic) {
    const url = new URL(window.location);

    if (topic) {
      url.searchParams.set('topic', topic);
    } else {
      url.searchParams.delete('topic');
    }

    // 使用 pushState 更新 URL，不刷新页面
    window.history.pushState({ topic: topic }, '', url);
  }

  /**
   * 过滤文章
   */
  function filterArticles(topic) {
    let visibleCount = 0;

    articles.forEach(article => {
      const articleTopic = article.getAttribute('data-topic');

      if (!topic || articleTopic === topic) {
        article.style.display = '';
        visibleCount++;
      } else {
        article.style.display = 'none';
      }
    });

    // 如果没有匹配的文章，显示提示信息
    showNoResultsMessage(visibleCount === 0);
  }

  /**
   * 显示/隐藏"无结果"提示信息
   */
  function showNoResultsMessage(show) {
    let messageEl = document.getElementById('no-results-message');

    if (show) {
      if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'no-results-message';
        messageEl.className = 'text-center text-gray-500 py-8';
        messageEl.innerHTML = '<p class="text-lg">暂无该主题的文章</p>';
        articleList.appendChild(messageEl);
      }
    } else {
      if (messageEl) {
        messageEl.remove();
      }
    }
  }

  /**
   * 初始化过滤器
   */
  function init() {
    // 从 URL 读取初始 topic 值
    const initialTopic = getTopicFromURL();

    if (initialTopic) {
      filterSelect.value = initialTopic;
      filterArticles(initialTopic);
    }

    // 监听下拉菜单变化
    filterSelect.addEventListener('change', function() {
      const selectedTopic = this.value;
      updateURL(selectedTopic);
      filterArticles(selectedTopic);
    });

    // 监听浏览器前进/后退按钮
    window.addEventListener('popstate', function(event) {
      const topic = (event.state && event.state.topic) || getTopicFromURL();
      filterSelect.value = topic;
      filterArticles(topic);
    });
  }

  // DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
