(() => {
  // <stdin>
  var searchData = null;
  async function initSearch() {
    try {
      const response = await fetch("/index.json");
      searchData = await response.json();
      console.log("\u641C\u7D22\u6570\u636E\u5DF2\u52A0\u8F7D\uFF0C\u5171", searchData.length, "\u6761\u8BB0\u5F55");
      console.log("\u793A\u4F8B\u6570\u636E:", searchData.slice(0, 2));
    } catch (error) {
      console.error("\u641C\u7D22\u6570\u636E\u52A0\u8F7D\u5931\u8D25:", error);
    }
  }
  function performSearch(query) {
    if (!searchData || !query.trim()) {
      return [];
    }
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter((term) => term.length > 0);
    const results = searchData.map((item) => {
      let score = 0;
      let matchedFields = [];
      const fields = {
        title: item.title || "",
        content: item.content || "",
        summary: item.summary || "",
        description: item.description || "",
        tags: Array.isArray(item.tags) ? item.tags.join(" ") : "",
        categories: Array.isArray(item.categories) ? item.categories.join(" ") : ""
      };
      const weights = {
        title: 5,
        // 标题最重要
        tags: 4,
        // 标签很重要
        summary: 3,
        // 摘要重要
        description: 3,
        // 描述重要
        categories: 2,
        // 分类次要
        content: 1
        // 内容基础分
      };
      queryTerms.forEach((term) => {
        Object.entries(fields).forEach(([fieldName, fieldValue]) => {
          const fieldLower = fieldValue.toLowerCase();
          if (fieldLower.includes(term)) {
            const exactMatch = fieldLower === term;
            const wordMatch = fieldLower.split(/\s+/).includes(term);
            let fieldScore = weights[fieldName];
            if (exactMatch) {
              fieldScore *= 3;
            } else if (wordMatch) {
              fieldScore *= 2;
            }
            if (fieldName === "title" && fieldLower.startsWith(term)) {
              fieldScore *= 1.5;
            }
            score += fieldScore;
            if (!matchedFields.includes(fieldName)) {
              matchedFields.push(fieldName);
            }
          }
        });
      });
      if (matchedFields.length > 1) {
        score *= 1 + matchedFields.length * 0.1;
      }
      const allTermsMatch = queryTerms.every(
        (term) => Object.values(fields).some(
          (field) => field.toLowerCase().includes(term)
        )
      );
      if (allTermsMatch) {
        score *= 1.2;
      }
      return {
        ...item,
        score,
        matchedFields
      };
    }).filter((item) => item.score > 0);
    return results.sort((a, b) => b.score - a.score);
  }
  function highlightMatch(text, query) {
    if (!text || !query) return text;
    const queryTerms = query.toLowerCase().split(/\s+/).filter((term) => term.length > 0);
    let highlightedText = text;
    queryTerms.forEach((term) => {
      const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      highlightedText = highlightedText.replace(regex, '<mark style="background: linear-gradient(120deg, #ffd700 0%, #ffed4a 100%); color: #2d3748; padding: 1px 2px; border-radius: 3px; font-weight: 600;">$1</mark>');
    });
    return highlightedText;
  }
  function createContextSnippet(content, query, maxLength = 150) {
    if (!content || !query) return content.substring(0, maxLength) + "...";
    const queryTerms = query.toLowerCase().split(/\s+/).filter((term) => term.length > 0);
    let bestSnippet = "";
    let maxMatches = 0;
    const contentLower = content.toLowerCase();
    const words = content.split(/\s+/);
    for (let i = 0; i < words.length - 20; i++) {
      const snippet = words.slice(i, i + 25).join(" ");
      const snippetLower = snippet.toLowerCase();
      const matches = queryTerms.filter((term) => snippetLower.includes(term)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestSnippet = snippet;
      }
    }
    if (!bestSnippet) {
      bestSnippet = content.substring(0, maxLength);
    }
    if (bestSnippet.length > maxLength) {
      bestSnippet = bestSnippet.substring(0, maxLength) + "...";
    }
    return highlightMatch(bestSnippet, query);
  }
  function displaySearchResults(results, query) {
    let resultsContainer = document.getElementById("search-results");
    if (!resultsContainer) {
      resultsContainer = document.createElement("div");
      resultsContainer.id = "search-results";
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
      document.getElementById("search-bar").appendChild(resultsContainer);
    }
    if (results.length === 0) {
      const suggestions = ["\u89C6\u594F", "\u97F3\u4E50", "\u5409\u4ED6", "IC Studio", "\u6559\u5B66"];
      const randomSuggestions = suggestions.sort(() => 0.5 - Math.random()).slice(0, 3);
      resultsContainer.innerHTML = `
            <div style="padding: 28px; text-align: center; color: #718096; font-size: 14px;">
                <div style="font-size: 42px; margin-bottom: 16px; opacity: 0.6;">\u{1F50D}</div>
                <div style="font-weight: 600; margin-bottom: 8px; color: #4a5568; font-size: 16px;">\u672A\u627E\u5230 "${highlightMatch(query, query)}" \u76F8\u5173\u5185\u5BB9</div>
                <div style="opacity: 0.8; margin-bottom: 16px;">\u8BD5\u8BD5\u4EE5\u4E0B\u641C\u7D22\u5EFA\u8BAE\uFF1A</div>
                <div style="display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;">
                    ${randomSuggestions.map(
        (suggestion) => `<span style="background: #e6edff; color: #667eea; padding: 4px 8px; border-radius: 12px; font-size: 12px; cursor: pointer;" onclick="document.querySelector('#search input').value='${suggestion}'; document.querySelector('#search input').dispatchEvent(new Event('input'));">${suggestion}</span>`
      ).join("")}
                </div>
            </div>
        `;
      resultsContainer.style.display = "block";
      return;
    }
    const resultHTML = results.slice(0, 8).map((result, index) => {
      const tags = Array.isArray(result.tags) && result.tags.length > 0 ? result.tags.slice(0, 3).map(
        (tag) => `<span style="background: #e6edff; color: #667eea; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-right: 4px;">${highlightMatch(tag, query)}</span>`
      ).join("") : "";
      const highlightedTitle = highlightMatch(result.title, query);
      const snippet = createContextSnippet(result.content || result.summary || "", query, 140);
      const matchInfo = result.matchedFields && result.matchedFields.length > 0 ? `<span style="font-size: 10px; color: #a0aec0;">\u5339\u914D: ${result.matchedFields.join(", ")}</span>` : "";
      const scoreInfo = result.score ? `<span style="font-size: 10px; color: #cbd5e0; margin-left: 8px;">\u8BC4\u5206: ${Math.round(result.score)}</span>` : "";
      return `
        <a href="${result.href}"
           style="
               display: block;
               padding: 16px 20px;
               text-decoration: none;
               transition: all 0.3s ease;
               border-bottom: ${index === results.slice(0, 8).length - 1 ? "none" : "1px solid rgba(230, 237, 255, 0.5)"};
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
                <span style="text-transform: uppercase; letter-spacing: 0.5px;">${result.type || "\u6587\u7AE0"} \u2022 ${result.date || "\u6700\u8FD1"}</span>
                <span>${matchInfo}${scoreInfo}</span>
            </div>
            ${tags ? `<div style="margin-bottom: 8px;">${tags}</div>` : ""}
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
    }).join("");
    const searchStats = `
        <div style="
            padding: 12px 20px;
            background: linear-gradient(135deg, #f8f9ff 0%, #e6edff 100%);
            border-bottom: 1px solid rgba(230, 237, 255, 0.8);
            font-size: 12px;
            color: #667eea;
            font-weight: 500;
        ">
            \u627E\u5230 <strong>${results.length}</strong> \u4E2A\u76F8\u5173\u7ED3\u679C\uFF0C\u641C\u7D22\u7528\u65F6 <strong>${Date.now() - (window.searchStartTime || Date.now())}ms</strong>
        </div>
    `;
    resultsContainer.innerHTML = searchStats + resultHTML;
    resultsContainer.style.display = "block";
  }
  function hideSearchResults() {
    const resultsContainer = document.getElementById("search-results");
    if (resultsContainer) {
      resultsContainer.style.display = "none";
      const results = resultsContainer.querySelectorAll("a");
      results.forEach((result) => {
        result.dataset.selected = "false";
        result.style.background = "transparent";
        result.style.transform = "translateY(0)";
      });
    }
  }
  function initSearchEventListeners() {
    const searchForm = document.getElementById("search");
    const searchInput = searchForm.querySelector('input[type="text"]');
    const searchButton = searchForm.querySelector("button");
    searchInput.placeholder = "\u641C\u7D22\u6587\u7AE0\u5185\u5BB9...";
    let searchTimeout;
    searchInput.addEventListener("input", (e) => {
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
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const query = searchInput.value.trim();
      if (query.length >= 2) {
        window.searchStartTime = Date.now();
        const results = performSearch(query);
        displaySearchResults(results, query);
      }
    });
    document.addEventListener("click", (e) => {
      const searchBar = document.getElementById("search-bar");
      if (!searchBar.contains(e.target)) {
        hideSearchResults();
      }
    });
    searchInput.addEventListener("keydown", (e) => {
      const resultsContainer = document.getElementById("search-results");
      if (!resultsContainer || resultsContainer.style.display === "none") return;
      const results = resultsContainer.querySelectorAll("a");
      let currentIndex = Array.from(results).findIndex((a) => a.dataset.selected === "true");
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (currentIndex >= 0) {
          results[currentIndex].dataset.selected = "false";
          results[currentIndex].style.background = "transparent";
          results[currentIndex].style.transform = "translateY(0)";
        }
        currentIndex = (currentIndex + 1) % results.length;
        results[currentIndex].dataset.selected = "true";
        results[currentIndex].style.background = "linear-gradient(135deg, #e6edff 0%, #d4e6ff 100%)";
        results[currentIndex].style.transform = "translateY(-1px)";
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (currentIndex >= 0) {
          results[currentIndex].dataset.selected = "false";
          results[currentIndex].style.background = "transparent";
          results[currentIndex].style.transform = "translateY(0)";
        }
        currentIndex = currentIndex <= 0 ? results.length - 1 : currentIndex - 1;
        results[currentIndex].dataset.selected = "true";
        results[currentIndex].style.background = "linear-gradient(135deg, #e6edff 0%, #d4e6ff 100%)";
        results[currentIndex].style.transform = "translateY(-1px)";
      } else if (e.key === "Enter" && currentIndex >= 0) {
        e.preventDefault();
        results[currentIndex].click();
      }
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    initSearch();
    initSearchEventListeners();
  });
})();
