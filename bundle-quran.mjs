// Membuat versi OFFLINE reload: teks Al-Qur'an & tata letak 604 halaman ditanam ke dalam HTML.
// Jalankan di komputer Anda (butuh Node 18+ dan internet):
//   node bundle-quran.mjs reload.html        -> menghasilkan reload.offline.html
// Hasilnya tidak lagi memanggil API saat berjalan, jadi tetap bisa dipakai di pratinjau/sandbox.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const src = process.argv[2] || 'reload.html';
const out = src.replace(/\.html$/, '') + '.offline.html';
const SURAH_VERSES = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
const plain = s => s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '').replace(/\u0671/g, '\u0627');
const words = t => t.split(/\s+/).filter(Boolean);
const arDigits = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getJSON(url, tries = 6) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url);
      if (r.status === 429) { await sleep(Number(r.headers.get('retry-after') || 0) * 1000 || 2000 * i); throw new Error('HTTP 429 (dibatasi server)'); }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      if (i >= tries) throw new Error(`${url} -> ${e.message}`);
      await sleep(800 * i);
    }
  }
}

async function main() {
if (!existsSync(src)) throw new Error(`File "${src}" tidak ditemukan. Periksa nama file di repo (harus sama dengan argumen).`);
console.log('1/3 Teks ayat (alquran.cloud)…');
const q = await getJSON('https://api.alquran.cloud/v1/quran/quran-uthmani');
const ay = {};
q.data.surahs.forEach((s, i) => {
  const n = i + 1, list = s.ayahs.map(a => a.text.trim());
  if (n !== 1 && plain(list[0]).startsWith('بسم الله الرحمن الرحيم')) list[0] = words(list[0]).slice(4).join(' ');
  ay[n] = list;
});

console.log('2/3 Nama surah (quran.com)…');
const ch = await getJSON('https://api.quran.com/api/v4/chapters?language=id');
const nm = Object.fromEntries(ch.chapters.map(c => [c.id, c.name_arabic]));

console.log('3/3 Tata letak 604 halaman (quran.com)…');
const pg = {};
for (let n = 1; n <= 604; n++) {
  let j;
  try { j = await getJSON(`https://api.quran.com/api/v4/verses/by_page/${n}?words=true&word_fields=text_uthmani,line_number&per_page=50`); }
  catch (e) { j = await getJSON(`https://api.quran.com/api/v4/verses/by_page/${n}?words=true&word_fields=text_uthmani&per_page=50`); }
  const rows = new Map();
  for (const v of j.verses) {
    const sn = +v.verse_key.split(':')[0], last = v.verse_number === SURAH_VERSES[sn - 1];
    for (const w of v.words) {
      if (w.line_number == null) throw new Error(`halaman ${n}: line_number tidak tersedia`);
      if (!rows.has(w.line_number)) rows.set(w.line_number, { w: [], start: 0, end: 0 });
      const row = rows.get(w.line_number);
      if (w.char_type_name === 'end') { row.w.push('﴿' + arDigits(v.verse_number) + '﴾'); if (last) row.end = 1; }
      else if (w.text_uthmani) row.w.push(w.text_uthmani);
      if (v.verse_number === 1 && w.position === 1) row.start = sn;
    }
  }
  const l = [];
  for (const k of [...rows.keys()].sort((a, b) => a - b)) {
    const r = rows.get(k);
    if (r.start) { l.push([0, r.start]); if (r.start !== 1 && r.start !== 9) l.push([1]); }
    l.push([2, r.end, r.w]);
  }
  pg[n] = { j: j.verses[0].juz_number, l };
  if (n % 50 === 0) console.log(`  ${n}/604`);
  await sleep(250);
}

const total = Object.values(ay).reduce((a, x) => a + x.length, 0);
if (total !== 6236) throw new Error(`Jumlah ayat ${total}, seharusnya 6236`);
const json = JSON.stringify({ v: 1, ay, nm, pg }).replace(/</g, '\\u003c');
let html = readFileSync(src, 'utf8');
html = html.replace(/<script id="quran-data">[\s\S]*?<\/script>\n?/, '');
const re = /<script>(\s*)\(\(\) => \{/;
if (!re.test(html)) throw new Error('Skrip utama (<script> lalu (() => {) tidak ditemukan di ' + src + '. Pastikan file adalah reload.html terbaru.');
html = html.replace(re, m => `<script id="quran-data">window.QURAN_DATA=${json};</script>\n` + m);
writeFileSync(out, html);
console.log(`Selesai: ${out} (${(html.length / 1048576).toFixed(1)} MB, ${total} ayat, 604 halaman)`);
}

main().catch(e => { console.error('::error::' + e.message); process.exit(1); });
