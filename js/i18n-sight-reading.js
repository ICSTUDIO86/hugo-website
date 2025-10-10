/**
 * IC Studio - 视奏工具页面国际化系统
 * 支持中英文切换
 */

class I18nSightReading {
  constructor() {
    this.currentLang = localStorage.getItem('ic-lang') || 'zh-CN';
    this.translations = {};
    this.loadedLanguages = new Set();
  }

  // 加载语言包
  async loadLanguage(lang) {
    if (this.loadedLanguages.has(lang)) {
      return this.translations[lang];
    }

    try {
      const response = await fetch(`/js/i18n/sight-reading-${lang}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load language: ${lang}`);
      }

      const data = await response.json();
      this.translations[lang] = data;
      this.loadedLanguages.add(lang);
      console.log(`✅ 已加载语言包: ${lang}`);
      return data;
    } catch (error) {
      console.error(`❌ 加载语言包失败 (${lang}):`, error);
      // 如果加载失败，使用默认中文
      if (lang !== 'zh-CN') {
        return this.loadLanguage('zh-CN');
      }
      return {};
    }
  }

  // 切换语言
  async switchLanguage(lang) {
    console.log(`🌐 切换语言: ${this.currentLang} → ${lang}`);

    // 加载新语言包
    await this.loadLanguage(lang);

    this.currentLang = lang;
    localStorage.setItem('ic-lang', lang);

    // 更新页面
    this.updatePageContent();
    this.updateLanguageSwitcher();

    console.log(`✅ 语言已切换至: ${lang}`);
  }

  // 获取翻译文本
  t(key) {
    const keys = key.split('.');
    let value = this.translations[this.currentLang];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // 如果找不到，返回key本身
      }
    }

    return value || key;
  }

  // 更新页面内容
  updatePageContent() {
    // 更新所有带data-i18n属性的元素
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);

      // 根据元素类型更新不同属性
      if (element.tagName === 'INPUT' && element.type === 'text') {
        element.placeholder = translation;
      } else if (element.hasAttribute('data-i18n-html')) {
        element.innerHTML = translation;
      } else {
        element.textContent = translation;
      }
    });

    // 更新title
    if (this.currentLang === 'en') {
      document.title = 'IC Studio - Sight Reading Tool';
    } else {
      document.title = 'IC Studio - 视奏工具';
    }

    console.log('✅ 页面内容已更新');
  }

  // 更新语言切换器UI
  updateLanguageSwitcher() {
    document.querySelectorAll('.lang-option').forEach(option => {
      if (option.dataset.lang === this.currentLang) {
        option.classList.add('active');
      } else {
        option.classList.remove('active');
      }
    });
  }

  // 初始化
  async init() {
    console.log('🌐 初始化i18n系统...');
    console.log('📍 当前语言:', this.currentLang);

    // 加载当前语言
    await this.loadLanguage(this.currentLang);

    // 更新页面内容
    this.updatePageContent();
    this.updateLanguageSwitcher();

    console.log('✅ i18n系统初始化完成');
  }
}

// 创建全局实例
window.i18n = new I18nSightReading();

// DOM加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.i18n.init());
} else {
  window.i18n.init();
}
