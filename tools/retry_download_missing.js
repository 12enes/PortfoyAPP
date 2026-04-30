/** 
 * tools/retry_download_missing.js 
 * Eksik TEFAS sembollerini tools/tefas_missing.txt'ten alır, 
 * farklı varyantlar deneyerek (UPPER/lower, .webp/.png) indirip PNG'ye dönüştürür. 
 * Çalıştır: node .\tools\retry_download_missing.js 
 */ 
const fs = require('fs'); 
const path = require('path'); 
const axios = require('axios'); 
const sharp = require('sharp');

const BASE = 'https://7k2v9x1r0z8t4m3n5p7w.com/icon/'; 
const logosDir = path.join(process.cwd(), 'assets', 'logos'); 
const missingPath = path.join(process.cwd(), 'tools', 'tefas_missing.txt'); 

if (!fs.existsSync(missingPath)) { 
  console.error('tools/tefas_missing.txt yok.'); 
  process.exit(1); 
} 

const missing = fs.readFileSync(missingPath, 'utf8').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);

(async () => { 
  for (const sym of missing) { 
    const attempts = [ 
      { name: sym.toUpperCase(), ext: '.webp' }, 
      { name: sym.toLowerCase(), ext: '.webp' }, 
      { name: sym.toUpperCase(), ext: '.png' }, 
      { name: sym.toLowerCase(), ext: '.png' } 
    ]; 
    let saved = false; 
    for (const a of attempts) { 
      const url = `${BASE}${a.name}${a.ext}`; 
      const target = path.join(logosDir, sym.toLowerCase() + '.png'); 
      try { 
        process.stdout.write(`Deneme: ${url} ... `); 
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 }); 
        const buf = Buffer.from(res.data); 
        // Eğer zaten PNG ise doğrudan kaydet, webp ise sharp ile dönüştür 
        if (a.ext === '.png') { 
          fs.writeFileSync(target, buf); 
        } else { 
          await sharp(buf).png().toFile(target); 
        } 
        console.log('kaydedildi ->', path.basename(target)); 
        saved = true; 
        break; 
      } catch (err) { 
        const stat = err.response && err.response.status ? ('HTTP ' + err.response.status) : err.message; 
        console.log('HATA ->', stat); 
      } 
    } 
    if (!saved) console.log('Bulunamadı:', sym); 
  } 
  console.log('Tekrar deneme tamamlandı.'); 
})();
