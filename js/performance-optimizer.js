/**
 * IC Studio - 性能优化器
 * 智能资源加载和性能监控系统
 */

class PerformanceOptimizer {
  constructor() {
    this.config = {
      // CDN 配置
      cdnEndpoints: [
        'https://cdn.jsdelivr.net',
        'https://unpkg.com',
        'https://cdnjs.cloudflare.com'
      ],
      
      // 性能阈值
      thresholds: {
        largeResourceSize: 500 * 1024, // 500KB
        slowLoadTime: 3000, // 3秒
        criticalRenderTime: 1000 // 1秒
      },
      
      // 缓存策略
      cacheStrategy: {
        images: 86400000, // 24小时
        scripts: 604800000, // 7天
        styles: 604800000, // 7天
        fonts: 2592000000 // 30天
      }
    };
    
    this.metrics = {
      loadTimes: {},
      resourceSizes: {},
      cacheHits: 0,
      cacheMisses: 0
    };
    
    this.init();
  }
  
  init() {
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
    } else {
      this.onDOMReady();
    }
    
    // 窗口加载完成后分析性能
    window.addEventListener('load', () => this.analyzePerformance());
  }
  
  onDOMReady() {
    this.optimizeImages();
    this.optimizeResourceLoading();
    this.setupIntersectionObserver();
    this.preloadCriticalResources();
  }
  
  // 图片优化
  optimizeImages() {
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
      // 添加懒加载
      if (!img.loading) {
        img.loading = 'lazy';
      }
      
      // 响应式图片优化
      this.optimizeImageSrc(img);
      
      // 图片加载错误处理
      img.onerror = () => this.handleImageError(img);
    });
  }
  
  optimizeImageSrc(img) {
    const src = img.src || img.dataset.src;
    if (!src) return;
    
    // 检测设备像素密度
    const devicePixelRatio = window.devicePixelRatio || 1;
    const viewportWidth = window.innerWidth;
    
    // 根据设备选择合适的图片尺寸
    let optimizedSrc = src;
    
    // 如果是高密度屏幕，使用 2x 图片
    if (devicePixelRatio > 1 && src.includes('/images/')) {
      optimizedSrc = src.replace('/images/', '/images/2x/');
    }
    
    // 小屏幕设备使用较小尺寸
    if (viewportWidth < 768 && src.includes('/images/')) {
      optimizedSrc = src.replace('/images/', '/images/mobile/');
    }
    
    // 检查优化后的图片是否存在
    this.checkImageExists(optimizedSrc).then(exists => {
      if (exists) {
        img.src = optimizedSrc;
      }
    });
  }
  
  checkImageExists(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }
  
  handleImageError(img) {
    // 图片加载失败时的备用方案
    console.warn('Image failed to load:', img.src);
    
    // 尝试从备用 CDN 加载
    if (img.src.includes('cdn.jsdelivr.net')) {
      img.src = img.src.replace('cdn.jsdelivr.net', 'unpkg.com');
    } else if (img.src.includes('unpkg.com')) {
      // 最后回退到本地资源
      const localSrc = img.src.replace(/https:\/\/[^\/]+/, '');
      img.src = localSrc;
    }
  }
  
  // 资源加载优化
  optimizeResourceLoading() {
    // 预加载关键资源
    this.preloadCriticalResources();
    
    // 延迟加载非关键资源
    this.deferNonCriticalResources();
    
    // 资源优先级管理
    this.manageResourcePriority();
  }
  
  preloadCriticalResources() {
    const criticalResources = [
      { href: '/css/critical.css', as: 'style' },
      { href: '/js/trial-limiter.js', as: 'script' },
      { href: '/images/ICLOGO.png', as: 'image' }
    ];
    
    criticalResources.forEach(resource => {
      if (!document.querySelector(`link[href="${resource.href}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource.href;
        link.as = resource.as;
        
        if (resource.as === 'script') {
          link.crossOrigin = 'anonymous';
        }
        
        document.head.appendChild(link);
      }
    });
  }
  
  deferNonCriticalResources() {
    // 延迟加载第三方脚本
    const deferredScripts = [
      'https://cdn.jsdelivr.net/npm/opensheetmusicdisplay@1.8.5/build/opensheetmusicdisplay.min.js'
    ];
    
    // 等待关键渲染完成后再加载
    setTimeout(() => {
      deferredScripts.forEach(src => {
        if (!document.querySelector(`script[src="${src}"]`)) {
          const script = document.createElement('script');
          script.src = src;
          script.async = true;
          script.defer = true;
          document.head.appendChild(script);
        }
      });
    }, 1000);
  }
  
  manageResourcePriority() {
    // 为关键资源设置高优先级
    const criticalLinks = document.querySelectorAll('link[rel="stylesheet"], link[rel="preload"]');
    criticalLinks.forEach(link => {
      if (!link.importance) {
        link.importance = 'high';
      }
    });
    
    // 为非关键资源设置低优先级
    const nonCriticalScripts = document.querySelectorAll('script[async]:not([data-critical])');
    nonCriticalScripts.forEach(script => {
      script.importance = 'low';
    });
  }
  
  // 设置 Intersection Observer 用于懒加载
  setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) return;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadLazyElement(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.1
    });
    
    // 观察需要懒加载的元素
    const lazyElements = document.querySelectorAll('[data-lazy]');
    lazyElements.forEach(element => observer.observe(element));
  }
  
  loadLazyElement(element) {
    const src = element.dataset.src;
    const type = element.dataset.lazy;
    
    switch (type) {
      case 'image':
        element.src = src;
        element.classList.remove('lazy-loading');
        break;
      case 'iframe':
        element.src = src;
        break;
      case 'script':
        this.loadScript(src);
        break;
    }
  }
  
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  // 性能分析
  analyzePerformance() {
    if (!('performance' in window)) return;
    
    // 获取性能指标
    const perfData = performance.getEntriesByType('navigation')[0];
    const paintData = performance.getEntriesByType('paint');
    
    this.metrics.navigationTiming = {
      dns: perfData.domainLookupEnd - perfData.domainLookupStart,
      tcp: perfData.connectEnd - perfData.connectStart,
      ssl: perfData.connectEnd - perfData.secureConnectionStart,
      ttfb: perfData.responseStart - perfData.requestStart,
      download: perfData.responseEnd - perfData.responseStart,
      domParsing: perfData.domContentLoadedEventStart - perfData.responseEnd,
      resourceLoading: perfData.loadEventStart - perfData.domContentLoadedEventEnd,
      total: perfData.loadEventEnd - perfData.navigationStart
    };
    
    // Core Web Vitals
    this.measureWebVitals();
    
    // 资源加载分析
    this.analyzeResourceLoading();
    
    // 发送性能报告
    this.sendPerformanceReport();
  }
  
  measureWebVitals() {
    // First Contentful Paint
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    if (fcp) {
      this.metrics.fcp = fcp.startTime;
    }
    
    // Largest Contentful Paint (需要 PerformanceObserver)
    if ('PerformanceObserver' in window) {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = lastEntry.startTime;
      }).observe({ entryTypes: ['largest-contentful-paint'] });
      
      // First Input Delay
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.metrics.fid = entry.processingStart - entry.startTime;
        });
      }).observe({ entryTypes: ['first-input'] });
    }
  }
  
  analyzeResourceLoading() {
    const resources = performance.getEntriesByType('resource');
    
    resources.forEach(resource => {
      const size = resource.transferSize || resource.encodedBodySize || 0;
      const loadTime = resource.responseEnd - resource.startTime;
      
      this.metrics.resourceSizes[resource.name] = size;
      this.metrics.loadTimes[resource.name] = loadTime;
      
      // 检查是否有性能问题
      if (size > this.config.thresholds.largeResourceSize) {
        console.warn('Large resource detected:', resource.name, size + ' bytes');
      }
      
      if (loadTime > this.config.thresholds.slowLoadTime) {
        console.warn('Slow resource loading:', resource.name, loadTime + ' ms');
      }
    });
  }
  
  sendPerformanceReport() {
    // 只在生产环境发送报告
    if (window.location.hostname === 'localhost') return;
    
    const report = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      metrics: this.metrics,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: window.devicePixelRatio
      },
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null
    };
    
    // 发送到性能监控服务
    this.sendToAnalytics(report);
  }
  
  sendToAnalytics(data) {
    // 使用 sendBeacon API 发送数据
    if ('sendBeacon' in navigator) {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      navigator.sendBeacon('/api/performance', blob);
    } else {
      // 备用方案：使用 fetch
      fetch('/api/performance', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        },
        keepalive: true
      }).catch(error => {
        console.warn('Failed to send performance data:', error);
      });
    }
  }
  
  // 优化建议
  getOptimizationSuggestions() {
    const suggestions = [];
    
    // 检查图片优化
    const images = document.querySelectorAll('img');
    const unoptimizedImages = Array.from(images).filter(img => 
      !img.loading || img.loading !== 'lazy'
    );
    
    if (unoptimizedImages.length > 0) {
      suggestions.push(`Found ${unoptimizedImages.length} images without lazy loading`);
    }
    
    // 检查未使用的 CSS
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    if (stylesheets.length > 5) {
      suggestions.push('Consider consolidating CSS files');
    }
    
    // 检查阻塞资源
    const blockingScripts = document.querySelectorAll('script:not([async]):not([defer])');
    if (blockingScripts.length > 0) {
      suggestions.push(`Found ${blockingScripts.length} render-blocking scripts`);
    }
    
    return suggestions;
  }
}

// 自动初始化性能优化器
const performanceOptimizerInstance = new PerformanceOptimizer();

// 暴露到全局作用域供调试使用
window.performanceOptimizer = performanceOptimizerInstance;

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceOptimizer;
}