/** 
 * tools/download_v2_institutions.js 
 */ 
const fs = require('fs'); 
const path = require('path'); 
const axios = require('axios'); 
const sharp = require('sharp');

const outDir = path.join(process.cwd(), 'assets', 'logos'); 
const BASE = 'https://7k2v9x1r0z8t4m3n5p7w.com/icon/';

const v2 = [
  { id: 'phillip',   query: 'PHE' },
  { id: 'ktportfoy', query: 'KLU' },
  { id: 'ziraat',    query: 'ZCN' },
  { id: 'piramit',   query: 'PBR' },
  { id: 'purportfoy',query: 'PPS' }, // Pür ve PP1 için
  { id: 'pruva',     query: 'PRU' },
  { id: 'hedef',     query: 'HFI' },
  { id: 'neoportfoy',query: 'NSP' },
  { id: 'bogazici',  query: 'BHF' },
  { id: 'tacirler',  query: 'TLY' }
];

(async () => {
  for (const inst of v2) {
    const url = `${BASE}${inst.query}.webp`;
    const target = path.join(outDir, `${inst.id}.png`);
    try {
      console.log(`İndiriliyor: ${inst.id}...`);
      const res = await axios.get(url, { responseType: 'arraybuffer' });
      await sharp(Buffer.from(res.data)).png().toFile(target);
    } catch (e) { console.log(`${inst.id} hata.`); }
  }
  console.log('V2 kurum logoları tamamlandı.');
})();
