/* tools/check_tefas_logos.js 
tools/tefas_symbols.txt içindeki semboller için assets/logos/<symbol>.png dosyasının varlığını kontrol eder. 
Sonuçları tools/tefas_present.txt ve tools/tefas_missing.txt'e yazar ve konsola özet basar. 
Çalıştır: node .\tools\check_tefas_logos.js */ 
const fs = require('fs'); 
const path = require('path');

const symbolsPath = path.join(process.cwd(), 'tools', 'tefas_symbols.txt'); 
if (!fs.existsSync(symbolsPath)) { 
  console.error('ERROR: tools/tefas_symbols.txt bulunamadı:', symbolsPath); 
  process.exit(1); 
} 
const symbols = fs.readFileSync(symbolsPath, 'utf8').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);

const logosDir = path.join(process.cwd(), 'assets', 'logos'); 
const present = []; 
const missing = [];

for (const sym of symbols) { 
  const fname = path.join(logosDir, sym.toLowerCase() + '.png'); 
  if (fs.existsSync(fname)) present.push(sym); 
  else missing.push(sym); 
}

if (!fs.existsSync('tools')) fs.mkdirSync('tools', { recursive: true }); 
fs.writeFileSync(path.join('tools','tefas_present.txt'), present.join('\n')); 
fs.writeFileSync(path.join('tools','tefas_missing.txt'), missing.join('\n'));

console.log('TEFAS symbols total:', symbols.length); 
console.log('Present count:', present.length); 
console.log('Missing count:', missing.length); 
if (present.length > 0) { 
  console.log('Present (first 200):', present.slice(0,200)); 
} 
if (missing.length > 0) { 
  console.log('Missing (first 200):', missing.slice(0,200)); 
}
