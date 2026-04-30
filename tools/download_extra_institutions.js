/** 
 * tools/download_extra_institutions.js 
 */ 
const fs = require('fs'); 
const path = require('path'); 
const axios = require('axios'); 
const sharp = require('sharp');

const outDir = path.join(process.cwd(), 'assets', 'logos'); 
const BASE = 'https://7k2v9x1r0z8t4m3n5p7w.com/icon/';

const extra = [
  { id: 'vakif',   query: 'VAF' }, // Vakıf Portföy
  { id: 'qnb',     query: 'QIZ' }, // QNB Finans
  { id: 'oyak',    query: 'OKP' }, // OYAK
  { id: 'fiba',    query: 'FIL' }, // Fiba Portföy
  { id: 'deniz',   query: 'DLY' }, // Deniz Portföy
  { id: 'teb',     query: 'TBT' }, // TEB Portföy
  { id: 'hsbc',    query: 'HBF' }, // HSBC
  { id: 'ziraat',  query: 'ZPF' }  // Ziraat Portföy
];

(async () => {
  for (const inst of extra) {
    const url = `${BASE}${inst.query}.webp`;
    const target = path.join(outDir, `${inst.id}.png`);
    try {
      console.log(`İndiriliyor: ${inst.id}...`);
      const res = await axios.get(url, { responseType: 'arraybuffer' });
      await sharp(Buffer.from(res.data)).png().toFile(target);
    } catch (e) { }
  }
  console.log('Ek kurum logoları tamamlandı.');
})();
