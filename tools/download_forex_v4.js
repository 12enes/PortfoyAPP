/** 
 * tools/download_forex_v4.js 
 */ 
const fs = require('fs'); 
const path = require('path'); 
const axios = require('axios'); 
const sharp = require('sharp');

const outDir = path.join(process.cwd(), 'assets', 'logos'); 

const assets = [
  { id: 'altin', url: 'https://assets.coingecko.com/coins/images/279/small/gold.png' },
  { id: 'xau',   url: 'https://assets.coingecko.com/coins/images/279/small/gold.png' },
  { id: 'silver',url: 'https://assets.coingecko.com/coins/images/280/small/silver.png' },
  { id: 'xag',   url: 'https://assets.coingecko.com/coins/images/280/small/silver.png' },
  { id: 'platinum', url: 'https://assets.coingecko.com/coins/images/3151/small/platinum.png' }
];

(async () => {
  for (const item of assets) {
    const target = path.join(outDir, `${item.id}.png`);
    try {
      console.log(`İndiriliyor: ${item.id}...`);
      const res = await axios.get(item.url, { responseType: 'arraybuffer' });
      await sharp(Buffer.from(res.data)).png().toFile(target);
      console.log(`${item.id} başarılı.`);
    } catch (e) { console.log(`${item.id} hata.`); }
  }
  console.log('V4 indirme tamamlandı.');
})();
