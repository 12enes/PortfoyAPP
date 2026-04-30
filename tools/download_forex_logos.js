/** 
 * tools/download_forex_logos.js 
 */ 
const fs = require('fs'); 
const path = require('path'); 
const axios = require('axios'); 
const sharp = require('sharp');

const outDir = path.join(process.cwd(), 'assets', 'logos'); 

const forex = [
  { id: 'usd',   url: 'https://flagcdn.com/w160/us.png' },
  { id: 'eur',   url: 'https://flagcdn.com/w160/eu.png' },
  { id: 'gbp',   url: 'https://flagcdn.com/w160/gb.png' },
  { id: 'try',   url: 'https://flagcdn.com/w160/tr.png' },
  { id: 'altin', url: 'https://7k2v9x1r0z8t4m3n5p7w.com/icon/XAU.webp' },
  { id: 'silver',url: 'https://7k2v9x1r0z8t4m3n5p7w.com/icon/XAG.webp' },
  { id: 'xau',   url: 'https://7k2v9x1r0z8t4m3n5p7w.com/icon/XAU.webp' },
  { id: 'xag',   url: 'https://7k2v9x1r0z8t4m3n5p7w.com/icon/XAG.webp' },
  { id: 'platinum', url: 'https://7k2v9x1r0z8t4m3n5p7w.com/icon/XPT.webp' }
];

(async () => {
  for (const item of forex) {
    const target = path.join(outDir, `${item.id}.png`);
    try {
      console.log(`İndiriliyor: ${item.id}...`);
      const res = await axios.get(item.url, { responseType: 'arraybuffer' });
      await sharp(Buffer.from(res.data)).png().toFile(target);
    } catch (e) { console.log(`${item.id} hata: ${e.message}`); }
  }
  console.log('Döviz ve Altın logoları tamamlandı.');
})();
