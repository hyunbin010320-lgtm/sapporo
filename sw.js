// 삿포로 여행 앱: 한 번 열어두면 인터넷이 없어도 열리게 저장해 두는 파일
const CACHE = 'sapporo-202609301751';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(CORE.map((u) =>
    c.add(new Request(u, { mode: u.startsWith('http') ? 'cors' : 'same-origin' })).catch(() => null)
  ))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
const LIVE = ['open-meteo.com', 'frankfurter', 'er-api.com'];
function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (LIVE.some((h) => url.hostname.includes(h))) return;
  const isPage = req.mode === 'navigate' || (url.origin === self.location.origin && (url.pathname.endsWith('/') || url.pathname.endsWith('.html')));
  if (isPage) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const net = fetch(req).then((r) => { if (r && r.ok) cache.put('./index.html', r.clone()); return r; });
      try { return await Promise.race([net, timeout(4000)]); }
      catch (err) {
        const hit = await cache.match('./index.html');
        if (hit) { e.waitUntil(net.catch(() => null)); return hit; }
        return net;
      }
    })());
    return;
  }
  const cacheable = url.origin === self.location.origin || url.hostname === 'cdnjs.cloudflare.com' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!cacheable) return;
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
    if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
    return r;
  })));
});
