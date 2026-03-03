/**
 * Cognote - 视奏工具页面国际化系统
 * Internationalization System for Sight Reading Tool
 *
 * Copyright © 2026 Cognote. All rights reserved.
 * Author: Igor Chen
 * Website: https://icstudio.club
 */

class I18n {
  constructor() {
    // 1. 首先检查 localStorage 是否有用户选择
    const savedLang = localStorage.getItem('ic-sight-reading-lang');

    // 2. 如果没有保存的选择，自动检测浏览器语言
    if (!savedLang) {
      const browserLang = navigator.language || navigator.userLanguage;
      // 检测是否为中文环境（支持 zh, zh-CN, zh-TW, zh-HK）
      const isChinese = browserLang && browserLang.toLowerCase().startsWith('zh');
      this.currentLang = isChinese ? 'zh-CN' : 'en';
      console.log(`🌍 浏览器语言检测: ${browserLang} → ${this.currentLang}`);
    } else {
      this.currentLang = savedLang;
      console.log(`💾 使用保存的语言: ${savedLang}`);
    }

    this.translations = {};
    this.loadedLanguages = new Set();
  }

  /**
   * 异步加载语言包
   * @param {string} lang - 语言代码 (zh-CN, en)
   */
  async loadLanguage(lang) {
    if (this.loadedLanguages.has(lang)) {
      return this.translations[lang];
    }

    try {
      const response = await fetch(`/sight-reading-tool/js/i18n/${lang}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load language: ${lang}`);
      }

      const translations = await response.json();
      this.translations[lang] = translations;
      this.loadedLanguages.add(lang);

      console.log(`✅ Language loaded: ${lang}`);
      return translations;
    } catch (error) {
      console.error(`❌ Error loading language ${lang}:`, error);
      // 降级到中文
      if (lang !== 'zh-CN') {
        return await this.loadLanguage('zh-CN');
      }
      return {};
    }
  }

  /**
   * 获取翻译文本
   * @param {string} key - 翻译键 (例如: "hero.title")
   * @param {string} lang - 语言代码
   */
  translate(key, lang = this.currentLang) {
    const keys = key.split('.');
    let value = this.translations[lang];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // 返回原始key作为降级
      }
    }

    return value || key;
  }

  /**
   * 应用翻译到DOM
   */
  applyTranslations() {
    // 处理 data-i18n 文本内容
    const elements = document.querySelectorAll('[data-i18n]');
    const currentTranslations = this.translations[this.currentLang] || {};

    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.translate(key);

      if (translation && translation !== key) {
        // 检查是否为HTML内容
        if (element.hasAttribute('data-i18n-html')) {
          element.innerHTML = translation;
        } else {
          element.textContent = translation;
        }
      }
    });

    // 处理 data-i18n-placeholder 属性
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      const translation = this.translate(key);

      if (translation && translation !== key) {
        element.placeholder = translation;
      }
    });

    console.log(`🌐 Translations applied: ${this.currentLang}`);
  }

  /**
   * 切换语言
   * @param {string} lang - 目标语言代码
   */
  async switchLanguage(lang) {
    if (lang === this.currentLang) {
      console.log(`ℹ️ Already in language: ${lang}`);
      return;
    }

    console.log(`🔄 Switching language: ${this.currentLang} → ${lang}`);

    // 加载语言包（如果尚未加载）
    await this.loadLanguage(lang);

    // 切换当前语言
    this.currentLang = lang;

    // 保存到 localStorage
    localStorage.setItem('ic-sight-reading-lang', lang);

    // 应用翻译
    this.applyTranslations();

    // 更新语言切换器按钮状态
    this.updateLanguageSwitcher();

    // 广播语言变化，供页面其他模块同步（如 Hero 图片）
    window.dispatchEvent(new CustomEvent('ic-language-changed', {
      detail: { lang: this.currentLang }
    }));

    console.log(`✅ Language switched to: ${lang}`);
  }

  /**
   * 更新语言切换器按钮状态
   */
  updateLanguageSwitcher() {
    const buttons = document.querySelectorAll('.lang-option');
    buttons.forEach(btn => {
      const btnLang = btn.getAttribute('data-lang');
      if (btnLang === this.currentLang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  /**
   * 初始化 i18n 系统
   */
  async init() {
    console.log('🚀 Initializing i18n system...');

    // 加载当前语言
    await this.loadLanguage(this.currentLang);

    // 如果当前不是中文，也预加载中文作为降级
    if (this.currentLang !== 'zh-CN') {
      await this.loadLanguage('zh-CN');
    }

    // 应用翻译
    this.applyTranslations();

    // 更新切换器状态
    this.updateLanguageSwitcher();

    // 初始化后广播一次当前语言
    window.dispatchEvent(new CustomEvent('ic-language-changed', {
      detail: { lang: this.currentLang }
    }));

    console.log('✅ i18n system initialized');
  }
}

// 创建全局实例
window.i18n = new I18n();

// DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.i18n.init();
  });
} else {
  window.i18n.init();
}
