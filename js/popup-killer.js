/**
 * 弹窗终结器 - 彻底移除所有权限弹窗
 */

(function() {
  'use strict';
  
  console.log('🔥 启动弹窗终结器');
  
  // 要移除的弹窗选择器
  const popupSelectors = [
    '#permission-denied-dialog',
    '.trial-warning-popup',
    '[id*="permission"]',
    '[class*="permission"]',
    '[class*="trial-warning"]'
  ];
  
  // 要搜索和移除的文本内容
  const bannedTexts = [
    '高级功能 需要完整版权限',
    '需要完整版权限',
    '立即购买',
    '稍后再说',
    '试用时间即将结束'
  ];
  
  // 移除弹窗的函数
  function killPopups() {
    // 1. 通过选择器移除
    popupSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        console.log('🔥 通过选择器移除弹窗:', selector);
        element.remove();
      });
    });
    
    // 2. 通过文本内容搜索移除
    bannedTexts.forEach(text => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: function(node) {
            if (node.textContent && node.textContent.includes(text)) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
          }
        }
      );
      
      const nodesToRemove = [];
      let node;
      while (node = walker.nextNode()) {
        // 检查是否是弹窗容器
        const style = window.getComputedStyle(node);
        if (style.position === 'fixed' && style.zIndex > 1000) {
          nodesToRemove.push(node);
        }
      }
      
      nodesToRemove.forEach(node => {
        console.log('🔥 通过文本内容移除弹窗:', text, node);
        node.remove();
      });
    });
  }
  
  // 立即执行一次
  killPopups();
  
  // 监听DOM变化，如果有新弹窗出现就立即移除
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // 检查新添加的节点是否是弹窗
          const style = window.getComputedStyle(node);
          if (style.position === 'fixed' && style.zIndex > 1000) {
            // 检查内容是否包含禁用文本
            if (bannedTexts.some(text => node.textContent.includes(text))) {
              console.log('🔥 检测到新弹窗并立即移除:', node);
              node.remove();
              return;
            }
          }
          
          // 检查子元素
          bannedTexts.forEach(text => {
            const matches = node.querySelectorAll(`*:contains("${text}")`);
            matches.forEach(match => {
              const matchStyle = window.getComputedStyle(match);
              if (matchStyle.position === 'fixed') {
                console.log('🔥 检测到子元素弹窗并移除:', text, match);
                match.remove();
              }
            });
          });
        }
      });
    });
  });
  
  // 开始监听
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // 定期清理（每秒检查一次）
  setInterval(killPopups, 1000);
  
  console.log('✅ 弹窗终结器已启动');
})();
