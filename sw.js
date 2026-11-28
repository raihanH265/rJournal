const C = 'reload-v5';
const API = /(^|\.)(quran\.com|alquran\.cloud)$/;
// Ikon, manifest, dan folder assets/ bisa diganti admin: selalu cek jaringan (revalidasi), cache hanya cadangan offline.
const FRESH = /\/(icon-\d+\.png|manifest\.json|assets\/.+)$/;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())
));
// Supabase selalu online (data pribadi tidak di-cache). Halaman dan API Al-Qur'an: jaringan dulu, cache sebagai cadangan offline.
// Aset lain (font, pustaka): cache dulu. Ikon/manifest/assets: jaringan dulu (lihat FRESH). Permintaan ?_=/?probe= (anti-cache) tidak diurus SW.
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.hostname.endsWith('supabase.co') || /[?&](_|probe)=/.test(u.search)) return;
  const save = res => { if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(C).then(c => c.put(r, copy)); } return res; };
  if (u.origin === location.origin && FRESH.test(u.pathname)) return e.respondWith(fetch(r, { cache: 'no-cache' }).then(save).catch(() => caches.match(r)));
  if (r.mode === 'navigate' || API.test(u.hostname)) return e.respondWith(fetch(r).then(save).catch(() => caches.match(r)));
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(save)));
});
