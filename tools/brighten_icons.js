/** 
 * tools/brighten_icons.js 
 */ 
const fs = require('fs'); 
const path = require('path'); 
const sharp = require('sharp');

const outDir = path.join(process.cwd(), 'assets', 'logos'); 
const icons = ['silver.png', 'platinum.png', 'xag.png', 'xpt.png'];

(async () => {
  for (const name of icons) {
    const filePath = path.join(outDir, name);
    if (fs.existsSync(filePath)) {
      try {
        console.log(`Parlatılıyor: ${name}...`);
        const buffer = fs.readFileSync(filePath);
        // Parlaklığı ve kontrastı ciddi oranda artır
        await sharp(buffer)
          .modulate({ brightness: 2.5, saturation: 1.2 })
          .toFile(path.join(outDir, `bright_${name}`));
        
        // Orijinal dosyanın üzerine yaz
        fs.renameSync(path.join(outDir, `bright_${name}`), filePath);
        console.log(`${name} parlatıldı.`);
      } catch (e) { console.log(`${name} hata: ${e.message}`); }
    }
  }
})();
