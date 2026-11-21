/**
 * 墨览 PWA：缓存应用壳，满足可安装条件；本地文档仍走 File System Access。
 * 壳资源网络优先，避免 ignoreSearch 把 ?v= 新 CSS/JS 配成旧缓存。
 */
const CACHE = "molan-shell-v2";
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./favicon.png",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./molan.css",
  "./molan-pwa.css",
  "./molan-i18n.js",
  "./molan-aphorisms.js",
  "./molan-editor.js",
  "./molan-app.js",
  "./molan-pwa.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (
          res &&
          res.ok &&
          (url.pathname.endsWith("/") ||
            /\.(html|js|css|png|webmanifest|svg|woff2)$/i.test(url.pathname))
        ) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
