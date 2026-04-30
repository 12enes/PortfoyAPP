/** 
 * tools/download_institution_logos.js 
 * Ana portföy yönetim şirketlerinin logolarını indirir. 
 */ 
const fs = require('fs'); 
const path = require('path'); 
const axios = require('axios'); 
const sharp = require('sharp');

const outDir = path.join(process.cwd(), 'assets', 'logos'); 
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const institutions = [
  { id: 'akportfoy', query: 'AKB' }, // Ak Portföy (mevcut bir fandan alıyoruz)
  { id: 'isportfoy', query: 'TI2' }, // İş Portföy
  { id: 'yapikredi', query: 'YAC' }, // Yapı Kredi
  { id: 'garanti',   query: 'GAF' }, // Garanti
  { id: 'istanbul', query: 'IPB' }, // İstanbul Portföy
  { id: 'tacirler',  query: 'TKF' }, // Tacirler
  { id: 'marmara',   query: 'MAC' }  // Marmara Capital
];

const BASE = 'https://7k2v9x1r0z8t4m3n5p7w.com/icon/';

(async () => {
  for (const inst of institutions) {
    const url = `${BASE}${inst.query}.webp`;
    const target = path.join(outDir, `${inst.id}.png`);
    try {
      console.log(`İndiriliyor: ${inst.id} (${url})`);
      const res = await axios.get(url, { responseType: 'arraybuffer' });
      await sharp(Buffer.from(res.data)).png().toFile(target);
      console.log(`Başarılı: ${inst.id}.png`);
    } catch (e) {
      console.error(`Hata: ${inst.id} indirilemedi.`);
    }
  }
  console.log('Kurum logoları indirme işlemi tamamlandı.');
})();
