// いえトレ手帳 service worker — アプリ本体だけをキャッシュしてオフラインでも起動
// フォーム動画（YouTube等の外部動画・IFrame API）はキャッシュしない：外部ストリーミングとして毎回ネットから読む
const CACHE = 'ietore-v4.3';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  // 旧バージョン（ietore-v1〜v4.2）のキャッシュを削除
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return;   // YouTube・動画・その他の外部リクエストには関与しない（キャッシュもしない）
  // HTMLはネット優先（更新を反映）、オフライン時はキャッシュ
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put('./index.html', c)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // それ以外（アイコン・フォント）はキャッシュ優先
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); }
    return r;
  })));
});
