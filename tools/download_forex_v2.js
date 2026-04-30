/** 
 * tools/download_forex_v2.js 
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
  { id: 'xau',   url: 'https://raw.githubusercontent.com/atomiclabs/cryptocurrency-icons/master/128/color/gld.png' },
  { id: 'altin', url: 'https://raw.githubusercontent.com/atomiclabs/cryptocurrency-icons/master/128/color/gld.png' },
  { id: 'xag',   url: 'https://raw.githubusercontent.com/atomiclabs/cryptocurrency-icons/master/128/color/sil.png' },
  { id: 'silver',url: 'https://raw.githubusercontent.com/atomiclabs/cryptocurrency-icons/master/128/color/sil.png' },
  { id: 'platinum', url: 'https://raw.githubusercontent.com/atomiclabs/cryptocurrency-icons/master/128/color/plt.png' }
];

(async () => {
  for (const item of assets) {
    const target = path.join(outDir, `${item.id}.png`);
    try {
      console.log(`İndiriliyor: ${item.id}...`);
      const res = await axios.get(item.url, { responseType: 'arraybuffer' });
      await sharp(Buffer.from(res.data)).png().toFile(target);
    } catch (e) { console.log(`${item.id} hata.`); }
  }
  console.log('V2 indirme tamamlandı.');
})();
