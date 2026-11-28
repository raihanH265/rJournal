const C = 'reload-v3';
const API = /(^|\.)(quran\.com|alquran\.cloud)$/;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())
));
// Supabase selalu online (data pribadi tidak di-cache). Halaman dan API Al-Qur'an: jaringan dulu, cache sebagai cadangan offline.
// Aset lain (font, pustaka): cache dulu.
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.hostname.endsWith('supabase.co')) return;
  const save = res => { if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(C).then(c => c.put(r, copy)); } return res; };
  if (r.mode === 'navigate' || API.test(u.hostname)) return e.respondWith(fetch(r).then(save).catch(() => caches.match(r)));
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(save)));
});
