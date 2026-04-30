/** 
 * tools/download_forex_final.js 
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
  { id: 'altin', url: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Gold-bars.png' },
  { id: 'xau',   url: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Gold-bars.png' },
  { id: 'silver',url: 'https://upload.wikimedia.org/wikipedia/commons/3/37/Silver_bars.png' },
  { id: 'xag',   url: 'https://upload.wikimedia.org/wikipedia/commons/3/37/Silver_bars.png' }
];

(async () => {
  for (const item of assets) {
    const target = path.join(outDir, `${item.id}.png`);
    try {
      console.log(`İndiriliyor: ${item.id}...`);
      const res = await axios.get(item.url, { 
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      await sharp(Buffer.from(res.data)).png().toFile(target);
      console.log(`${item.id} başarılı.`);
    } catch (e) { console.log(`${item.id} hata.`); }
  }
  console.log('Final indirme tamamlandı.');
})();
