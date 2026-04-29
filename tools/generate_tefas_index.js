/* tools/generate_tefas_index.js 
tools/tefas_present.txt içindeki sembollere göre assets/logos/tefas_index.js oluşturur. 
Eksik default.png varsa 200x200 transparent default.png oluşturur (sharp kullanır). 
Çalıştır: node .\tools\generate_tefas_index.js */ 
const fs = require('fs'); 
const path = require('path'); 
const sharp = require('sharp');

const symbolsPath = path.join(process.cwd(), 'tools', 'tefas_present.txt'); 
const logosDir = path.join(process.cwd(), 'assets', 'logos'); 
if (!fs.existsSync(symbolsPath)) { 
  console.error('ERROR: tools/tefas_present.txt bulunamadı:', symbolsPath); 
  process.exit(1); 
} 
if (!fs.existsSync(logosDir)) { 
  console.error('ERROR: assets/logos dizini bulunamadı:', logosDir); 
  process.exit(1); 
}

const symbols = fs.readFileSync(symbolsPath, 'utf8').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);

const presentFiles = symbols.filter(s => { 
  const p = path.join(logosDir, s.toLowerCase()+'.png'); 
  return fs.existsSync(p); 
});

const defaultPath = path.join(logosDir, 'default.png'); 
async function ensureDefault() { 
  if (!fs.existsSync(defaultPath)) { 
    console.log('default.png yok, oluşturuluyor...'); 
    await sharp({ create: { width: 200, height: 200, channels: 4, background: { r: 240, g: 240, b: 240, alpha: 1 } } }) 
      .png() 
      .toFile(defaultPath); 
    console.log('default.png oluşturuldu:', defaultPath); 
  } else { 
    console.log('default.png zaten var.'); 
  } 
}

(async () => { 
  await ensureDefault();

  const lines = []; 
  lines.push('// Otomatik oluşturuldu: assets/logos/tefas_index.js'); 
  lines.push('// Bu dosya sadece TEFAS logolarını mapler. Diğer logoları etkilemez.'); 
  lines.push('const Logos = {'); 
  for (const s of presentFiles) { 
    const key = s.toLowerCase(); 
    lines.push(`  '${key}': require('./${key}.png'),`); 
  } 
  lines.push("  'default': require('./default.png'),"); 
  lines.push('};'); 
  lines.push(''); 
  lines.push('export default Logos;');

  const outPath = path.join(logosDir, 'tefas_index.js'); 
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8'); 
  console.log('Oluşturuldu:', outPath); 
  console.log('Present logos count (tefas):', presentFiles.length); 
  if (presentFiles.length > 0) console.log('First items:', presentFiles.slice(0, 200)); 
})();
