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
    const results = searchData.filter((item) => {
      const searchFields = [
        item.title || "",
        item.content || "",
        item.summary || ""
      ].join(" ").toLowerCase();
      return searchFields.includes(query.toLowerCase());
    });
    return results.sort((a, b) => {
      const aTitle = (a.title || "").toLowerCase();
      const bTitle = (b.title || "").toLowerCase();
      const queryLower = query.toLowerCase();
      if (aTitle.includes(queryLower) && !bTitle.includes(queryLower)) return -1;
      if (!aTitle.includes(queryLower) && bTitle.includes(queryLower)) return 1;
      return 0;
    });
  }
  function displaySearchResults(results, query) {
    let resultsContainer = document.getElementById("search-results");
    if (!resultsContainer) {
      resultsContainer = document.createElement("div");
      resultsContainer.id = "search-results";
      resultsContainer.className = "absolute top-full left-0 right-0 bg-white border border-zinc-200 rounded-lg shadow-lg mt-1 max-h-96 overflow-y-auto z-50";
      document.getElementById("search").appendChild(resultsContainer);
    }
    if (results.length === 0) {
      resultsContainer.innerHTML = `
            <div class="p-4 text-gray-500 text-center">
                \u672A\u627E\u5230\u4E0E"${query}"\u76F8\u5173\u7684\u7ED3\u679C
            </div>
        `;
      resultsContainer.style.display = "block";
      return;
    }
    const resultHTML = results.slice(0, 8).map((result) => `
        <a href="${result.href}" class="block p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <div class="font-semibold text-gray-800 mb-1">${result.title}</div>
            <div class="text-sm text-gray-600 mb-1">${result.type} \u2022 ${result.date}</div>
            <div class="text-sm text-gray-500 line-clamp-2">${result.summary || result.content.substring(0, 150)}...</div>
        </a>
    `).join("");
    resultsContainer.innerHTML = resultHTML;
    resultsContainer.style.display = "block";
  }
  function hideSearchResults() {
    const resultsContainer = document.getElementById("search-results");
    if (resultsContainer) {
      resultsContainer.style.display = "none";
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
        const results = performSearch(query);
        displaySearchResults(results, query);
      }, 300);
    });
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const query = searchInput.value.trim();
      if (query.length >= 2) {
        const results = performSearch(query);
        displaySearchResults(results, query);
      }
    });
    document.addEventListener("click", (e) => {
      if (!searchForm.contains(e.target)) {
        hideSearchResults();
      }
    });
    searchInput.addEventListener("keydown", (e) => {
      const resultsContainer = document.getElementById("search-results");
      if (!resultsContainer || resultsContainer.style.display === "none") return;
      const results = resultsContainer.querySelectorAll("a");
      let currentIndex = Array.from(results).findIndex((a) => a.classList.contains("bg-blue-50"));
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (currentIndex >= 0) results[currentIndex].classList.remove("bg-blue-50");
        currentIndex = (currentIndex + 1) % results.length;
        results[currentIndex].classList.add("bg-blue-50");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (currentIndex >= 0) results[currentIndex].classList.remove("bg-blue-50");
        currentIndex = currentIndex <= 0 ? results.length - 1 : currentIndex - 1;
        results[currentIndex].classList.add("bg-blue-50");
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
