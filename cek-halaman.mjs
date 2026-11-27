// Cocokkan SURAH_PAGE dan JUZ_PAGE di reload.html dengan Quran.com API v4 (butuh internet).
// Pakai: node cek-halaman.mjs reload.html
import fs from 'node:fs';
const html = fs.readFileSync(process.argv[2] || 'reload.html', 'utf8');
const grab = n => JSON.parse(html.match(new RegExp(`const ${n} = (\\[[^\\]]*\\])`))[1]);
const SURAH = grab('SURAH_PAGE'), JUZ = grab('JUZ_PAGE');
const get = async u => { const r = await fetch(u); if (!r.ok) throw new Error(r.status + ' ' + u); return r.json(); };
let bad = 0;
const cmp = (nama, kode, resmi) => { if (kode !== resmi) { bad++; console.log(`${nama}: kode ${kode}, API ${resmi}`); } };
const ch = (await get('https://api.quran.com/api/v4/chapters')).chapters;
if (ch.length !== 114 || SURAH.length !== 114) throw new Error('jumlah surah bukan 114');
ch.forEach((c, i) => cmp(`Surah ${c.id}`, SURAH[i], c.pages[0]));
const juzs = (await get('https://api.quran.com/api/v4/juzs')).juzs;
if (juzs.length !== 30 || JUZ.length !== 30) throw new Error('jumlah juz bukan 30');
for (const [i, j] of juzs.entries()) {
  const [s, a] = Object.entries(j.verse_mapping)[0];
  const v = (await get(`https://api.quran.com/api/v4/verses/by_key/${s}:${a.split('-')[0]}`)).verse;
  cmp(`Juz ${j.juz_number} (ayat ${v.verse_key})`, JUZ[i], v.page_number);
}
console.log(bad ? `${bad} beda` : 'semua cocok');
