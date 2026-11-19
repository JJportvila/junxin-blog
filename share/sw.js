/* 转发到博客 - Service Worker
 * 作用：让 PWA 可安装 + 离线时也能打开填写界面（发布仍需联网）。
 */
const CACHE = 'share-to-blog-v1';
const ASSETS = [
  '/share/',
  '/share/index.html',
  '/share/app.js',
  '/share/style.css',
  '/share/manifest.webmanifest',
  '/share/icon-192.png',
  '/share/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 对同源的 GET 请求走「缓存优先」，保证离线可打开；网络优先更新缓存。
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('/share/index.html')))
  );
});
