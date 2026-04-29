/* tools/download_and_convert.js 
WebP dosyalarını indirir ve PNG'ye çevirir. 
Çalıştır: node .\tools\download_and_convert.js */ 
const fs = require('fs'); 
const path = require('path'); 
const axios = require('axios'); 
const sharp = require('sharp');

const BASE = 'https://7k2v9x1r0z8t4m3n5p7w.com/icon/'; // CDN base 
const outDir = path.join(process.cwd(), 'assets', 'logos'); 
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const codesPath = path.join(process.cwd(), 'tools', 'symbols.txt'); // symbols.txt kullanıyoruz 
if (!fs.existsSync(codesPath)) { 
  console.error('tools/symbols.txt bulunamadı. tools/fund_codes.txt yerine tools/symbols.txt kullanılıyor.'); 
  process.exit(1); 
}

const codes = fs.readFileSync(codesPath, 'utf8') 
  .split(/\r?\n/) 
  .map(s => s.trim()) 
  .filter(Boolean);

(async () => { 
  for (const codeRaw of codes) { 
    const code = codeRaw.trim(); 
    const url = `${BASE}${code}.webp`; 
    const target = path.join(outDir, `${code.toLowerCase()}.png`); 
    if (fs.existsSync(target)) { 
      console.log(`${target} zaten var. Atlaniyor.`); 
      continue; 
    } 
    try { 
      process.stdout.write('İndiriliyor: ' + url + ' ... '); 
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 }); 
      const buf = Buffer.from(res.data); 
      await sharp(buf) 
        .png({ quality: 90, compressionLevel: 9 }) 
        .toFile(target); 
      console.log('kaydedildi -> ' + path.basename(target)); 
    } catch (err) { 
      console.log('HATA ->', path.basename(target), err.response && err.response.status ? ('HTTP ' + err.response.status) : err.message); 
    } 
  } 
  console.log('Tamamlandı. logos klasörü:', outDir); 
})();
