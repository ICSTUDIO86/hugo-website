/**
 * IC Studio - Service Worker
 * 缓存策略和离线支持
 */

const CACHE_NAME = 'ic-studio-v1.2.0';
const STATIC_CACHE = 'ic-studio-static-v1.2.0';
const DYNAMIC_CACHE = 'ic-studio-dynamic-v1.2.0';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/css/main.css',
  '/js/trial-limiter.js',
  '/js/cloudbase-manager.js',
  '/js/zpay-integration.js',
  '/js/performance-optimizer.js',
  '/images/ICLOGO.png',
  '/images/sight-reading-tool.png',
  '/tools/sight-reading-generator.html',
  '/manifest.json'
];

// 缓存策略配置
const CACHE_STRATEGIES = {
  // 静态资源：缓存优先（CSS使用网络优先以支持强制刷新）
  static: {
    pattern: /\.(js|png|jpg|jpeg|gif|svg|webp|woff|woff2)$/,
    strategy: 'cache-first',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30天
  },
  
  // CSS文件：网络优先，确保强制刷新时能获取最新样式
  css: {
    pattern: /\.css$/,
    strategy: 'network-first',
    maxAge: 24 * 60 * 60 * 1000 // 1天
  },
  
  // HTML 页面：网络优先，回退到缓存
  pages: {
    pattern: /\.html$|\/$/,
    strategy: 'network-first',
    maxAge: 24 * 60 * 60 * 1000 // 1天
  },
  
  // API 请求：网络优先
  api: {
    pattern: /\/api\//,
    strategy: 'network-first',
    maxAge: 5 * 60 * 1000 // 5分钟
  },
  
  // CDN 资源：缓存优先，较长过期时间
  cdn: {
    pattern: /^https:\/\/(cdn\.jsdelivr\.net|unpkg\.com|fonts\.googleapis\.com)/,
    strategy: 'cache-first',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
  }
};

// Service Worker 安装事件
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// Service Worker 激活事件
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              return cacheName.startsWith('ic-studio-') && 
                     !cacheName.includes('v1.2.0');
            })
            .map(cacheName => {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('Old caches cleaned up');
        return self.clients.claim();
      })
  );
});

// 网络请求拦截
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // 跳过 Chrome 扩展和非 HTTP(S) 请求
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }
  
  // 跳过 POST 请求
  if (request.method !== 'GET') {
    return;
  }
  
  // 检查是否是强制刷新（Shift+Command+R）
  // 如果是强制刷新，直接从网络获取，跳过Service Worker缓存
  if (request.cache === 'no-cache' || request.cache === 'reload') {
    event.respondWith(fetch(request));
    return;
  }
  
  // 确定缓存策略
  const strategy = getCacheStrategy(request);
  
  event.respondWith(
    handleRequest(request, strategy)
  );
});

// 确定缓存策略
function getCacheStrategy(request) {
  const url = request.url;
  
  for (const [name, config] of Object.entries(CACHE_STRATEGIES)) {
    if (config.pattern.test(url)) {
      return { name, ...config };
    }
  }
  
  // 默认策略：网络优先
  return {
    name: 'default',
    strategy: 'network-first',
    maxAge: 60 * 60 * 1000 // 1小时
  };
}

// 处理请求的核心函数
async function handleRequest(request, strategy) {
  switch (strategy.strategy) {
    case 'cache-first':
      return handleCacheFirst(request, strategy);
    case 'network-first':
      return handleNetworkFirst(request, strategy);
    case 'stale-while-revalidate':
      return handleStaleWhileRevalidate(request, strategy);
    default:
      return handleNetworkFirst(request, strategy);
  }
}

// 缓存优先策略
async function handleCacheFirst(request, strategy) {
  try {
    const cachedResponse = await getCachedResponse(request);
    
    if (cachedResponse) {
      // 检查是否过期
      const cacheTime = parseInt(cachedResponse.headers.get('sw-cache-time') || '0');
      const now = Date.now();
      
      if (now - cacheTime < strategy.maxAge) {
        return cachedResponse;
      }
    }
    
    // 缓存未命中或已过期，从网络获取
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      await cacheResponse(request, networkResponse.clone(), strategy);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache-first strategy failed:', error);
    
    // 网络失败，返回缓存（即使过期）
    const cachedResponse = await getCachedResponse(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 返回离线页面或错误响应
    return getOfflineResponse(request);
  }
}

// 网络优先策略
async function handleNetworkFirst(request, strategy) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      await cacheResponse(request, networkResponse.clone(), strategy);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', request.url);
    
    const cachedResponse = await getCachedResponse(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return getOfflineResponse(request);
  }
}

// 过时但可用策略
async function handleStaleWhileRevalidate(request, strategy) {
  const cachedResponse = await getCachedResponse(request);
  
  // 异步更新缓存
  const networkResponsePromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cacheResponse(request, response.clone(), strategy);
      }
      return response;
    })
    .catch(error => {
      console.log('Background update failed:', error);
    });
  
  // 立即返回缓存的响应（如果有）
  return cachedResponse || networkResponsePromise;
}

// 获取缓存的响应
async function getCachedResponse(request) {
  const caches = await self.caches.keys();
  
  for (const cacheName of caches) {
    const cache = await self.caches.open(cacheName);
    const response = await cache.match(request);
    if (response) {
      return response;
    }
  }
  
  return null;
}

// 缓存响应
async function cacheResponse(request, response, strategy) {
  const cacheName = getCacheName(strategy.name);
  const cache = await caches.open(cacheName);
  
  // 添加缓存时间戳
  const responseWithTimestamp = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...response.headers,
      'sw-cache-time': Date.now().toString()
    }
  });
  
  await cache.put(request, responseWithTimestamp);
}

// 获取缓存名称
function getCacheName(strategyName) {
  switch (strategyName) {
    case 'static':
      return STATIC_CACHE;
    case 'cdn':
      return STATIC_CACHE;
    default:
      return DYNAMIC_CACHE;
  }
}

// 获取离线响应
function getOfflineResponse(request) {
  const url = new URL(request.url);
  
  if (request.destination === 'document') {
    // HTML 页面请求，返回离线页面
    return new Response(`
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>离线模式 - IC Studio</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            text-align: center;
            padding: 2rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
          }
          .offline-content {
            max-width: 500px;
          }
          h1 { font-size: 2.5rem; margin-bottom: 1rem; }
          p { font-size: 1.2rem; margin-bottom: 2rem; opacity: 0.9; }
          button {
            background: rgba(255,255,255,0.2);
            color: white;
            border: 2px solid rgba(255,255,255,0.3);
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
          }
          button:hover {
            background: rgba(255,255,255,0.3);
          }
        </style>
      </head>
      <body>
        <div class="offline-content">
          <h1>🎵 IC Studio</h1>
          <p>你当前处于离线状态。请检查网络连接后重试。</p>
          <button onclick="location.reload()">重新加载</button>
        </div>
      </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  // 其他资源返回错误
  return new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

// 消息处理
self.addEventListener('message', event => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'CACHE_URLS':
      event.waitUntil(cacheUrls(payload.urls));
      break;
    case 'CLEAR_CACHE':
      event.waitUntil(clearCache(payload.cacheName));
      break;
    case 'GET_CACHE_SIZE':
      event.waitUntil(getCacheSize().then(size => {
        event.ports[0].postMessage({ size });
      }));
      break;
  }
});

// 缓存指定 URL
async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE);
  return Promise.allSettled(
    urls.map(url => cache.add(url))
  );
}

// 清除缓存
async function clearCache(cacheName) {
  if (cacheName) {
    return caches.delete(cacheName);
  } else {
    const cacheNames = await caches.keys();
    return Promise.all(
      cacheNames.map(name => caches.delete(name))
    );
  }
}

// 获取缓存大小
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (response && response.body) {
        const reader = response.body.getReader();
        let size = 0;
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.length;
          }
        } finally {
          reader.releaseLock();
        }
        
        totalSize += size;
      }
    }
  }
  
  return totalSize;
}

// 定期清理过期缓存
setInterval(async () => {
  try {
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      if (cacheName.includes('dynamic')) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        
        for (const request of keys) {
          const response = await cache.match(request);
          const cacheTime = parseInt(response.headers.get('sw-cache-time') || '0');
          const now = Date.now();
          
          // 清理超过1天的动态缓存
          if (now - cacheTime > 24 * 60 * 60 * 1000) {
            await cache.delete(request);
          }
        }
      }
    }
  } catch (error) {
    console.error('Cache cleanup failed:', error);
  }
}, 60 * 60 * 1000); // 每小时执行一次