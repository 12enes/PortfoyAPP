/** 
 * tools/download_bright_commodities.js 
 */ 
const fs = require('fs'); 
const path = require('path'); 
const axios = require('axios'); 
const sharp = require('sharp');

const outDir = path.join(process.cwd(), 'assets', 'logos'); 

const assets = [
  // Beyaz/Parlak versiyonlar
  { id: 'silver',   url: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/white/sil.png' },
  { id: 'xag',      url: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/white/sil.png' },
  { id: 'platinum', url: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/white/plt.png' },
  { id: 'xpt',      url: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/white/plt.png' }
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
  console.log('Parlak emtia logoları tamamlandı.');
})();
