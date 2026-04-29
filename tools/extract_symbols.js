/* tools/extract_symbols.js 
Proje dosyalarında "symbol" alanlarını ve büyük harfli kod benzerlerini bulup tools/symbols.txt'e yazar. 
Çalıştır: node .\tools\extract_symbols.js */ 
const fs = require('fs'); 
const path = require('path');

const walk = (dir, cb) => { 
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => { 
    const res = path.resolve(dir, entry.name); 
    if (entry.isDirectory() && !res.includes('node_modules') && !res.includes('.git')) { 
      walk(res, cb); 
    } else if (entry.isFile()) { 
      cb(res); 
    } 
  }); 
};

const exts = ['.js', '.jsx', '.ts', '.tsx', '.json', '.html']; 
const patterns = [ 
  /symbol["']?\s*[:=]\s*["']?([A-Za-z0-9_-]+)["']?/gi, 
  /"symbol"\s*:\s*"([A-Za-z0-9_-]+)"/gi, 
  /'symbol'\s*:\s*'([A-Za-z0-9_-]+)'/gi, 
  /icon\/([A-Z0-9_-]+)\.webp/gi, // doğrudan URL içerenler 
  /"'\s["'\s]/g // büyük harfli kısa kodları yakalamaya yardımcı (ilave adaylar) 
];

const found = new Set();

walk(process.cwd(), file => { 
  if (!exts.includes(path.extname(file))) return; 
  try { 
    const content = fs.readFileSync(file, 'utf8'); 
    patterns.forEach(re => { 
      let m; 
      while ((m = re.exec(content)) !== null) { 
        const code = (m[1] || '').trim(); 
        if (!code) continue; 
        // filtre: sadece harf/num/dash underscore içeren ve uzunluğu 2..6 arası olanları al 
        if (/^[A-Za-z0-9_-]{2,6}$/.test(code)) { 
          found.add(code); 
        } 
      } 
    }); 
  } catch (e) { 
    // ignore read errors 
  } 
});

const out = Array.from(found).sort(); 
if (!fs.existsSync('tools')) fs.mkdirSync('tools', { recursive: true }); 
fs.writeFileSync('tools/symbols.txt', out.join('\n')); 
console.log('Found symbols:', out.length); 
console.log('Saved to tools/symbols.txt'); 
console.log('First items (max 50):', out.slice(0,50));
