/* PEPMH service worker: guarda a página para o sistema abrir sem internet.
   Página: rede primeiro (sempre a versão nova quando há conexão), cópia guardada quando não há.
   Ícones, fontes e bibliotecas (cdnjs): cópia guardada primeiro.
   Supabase (dados) não passa por aqui: quem cuida dos dados offline é o IndexedDB do app. */
const VER = 'pepmh-__VER__';
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/favicon-32.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate' && url.origin === location.origin) {
    e.respondWith(fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(VER).then(c => c.put('/', cp)); } return r; })
      .catch(() => caches.match('/', { ignoreSearch: true })));
    return;
  }
  const staticHit = (url.origin === location.origin && (/\.(png|svg|webmanifest)$/.test(url.pathname)))
    || ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'].includes(url.hostname);
  if (staticHit) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok || r.type === 'opaque') { const cp = r.clone(); caches.open(VER).then(c => c.put(req, cp)); } return r; })));
  }
});
