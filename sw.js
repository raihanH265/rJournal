const C = 'rjournal-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())
));
// Supabase selalu online (data pribadi tidak di-cache); sisanya: halaman network-first, aset/API jadwal cache-first
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.hostname.endsWith('supabase.co')) return;
  const save = res => { if (res.ok || res.type === 'opaque') caches.open(C).then(c => c.put(r, res.clone())); return res; };
  if (r.mode === 'navigate') return e.respondWith(fetch(r).then(save).catch(() => caches.match(r)));
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(save)));
});
