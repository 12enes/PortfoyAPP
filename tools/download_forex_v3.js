/** 
 * tools/download_forex_v3.js 
 */ 
const fs = require('fs'); 
const path = require('path'); 
const axios = require('axios'); 
const sharp = require('sharp');

const outDir = path.join(process.cwd(), 'assets', 'logos'); 

const assets = [
  { id: 'usd',   url: 'https://flagcdn.com/w160/us.png' },
  { id: 'eur',   url: 'https://flagcdn.com/w160/eu.png' },
  { id: 'gbp',   url: 'https://flagcdn.com/w160/gb.png' },
  { id: 'try',   url: 'https://flagcdn.com/w160/tr.png' },
  { id: 'xau',   url: 'https://cryptoicons.org/api/color/gld/128' },
  { id: 'altin', url: 'https://cryptoicons.org/api/color/gld/128' },
  { id: 'xag',   url: 'https://cryptoicons.org/api/color/sil/128' },
  { id: 'silver',url: 'https://cryptoicons.org/api/color/sil/128' },
  { id: 'platinum', url: 'https://cryptoicons.org/api/color/plt/128' }
];

(async () => {
  for (const item of assets) {
    const target = path.join(outDir, `${item.id}.png`);
    try {
      console.log(`İndiriliyor: ${item.id}...`);
      const res = await axios.get(item.url, { responseType: 'arraybuffer' });
      await sharp(Buffer.from(res.data)).png().toFile(target);
      console.log(`${item.id} başarılı.`);
    } catch (e) { console.log(`${item.id} hata: ${e.message}`); }
  }
  console.log('V3 indirme tamamlandı.');
})();
