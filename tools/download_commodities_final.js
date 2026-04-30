/** 
 * tools/download_commodities_final.js 
 */ 
const fs = require('fs'); 
const path = require('path'); 
const axios = require('axios'); 
const sharp = require('sharp');

const outDir = path.join(process.cwd(), 'assets', 'logos'); 

const assets = [
  { id: 'altin', url: 'https://cdn-icons-png.flaticon.com/512/272/272530.png' },
  { id: 'xau',   url: 'https://cdn-icons-png.flaticon.com/512/272/272530.png' },
  { id: 'silver',url: 'https://cdn-icons-png.flaticon.com/512/272/272535.png' },
  { id: 'xag',   url: 'https://cdn-icons-png.flaticon.com/512/272/272535.png' },
  { id: 'platinum', url: 'https://cdn-icons-png.flaticon.com/512/3133/3133166.png' }
];

(async () => {
  for (const item of assets) {
    const target = path.join(outDir, `${item.id}.png`);
    try {
      console.log(`İndiriliyor: ${item.id}...`);
      const res = await axios.get(item.url, { 
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      await sharp(Buffer.from(res.data)).png().toFile(target);
      console.log(`${item.id} başarılı.`);
    } catch (e) { console.log(`${item.id} hata.`); }
  }
  console.log('Emtia logoları tamamlandı.');
})();
