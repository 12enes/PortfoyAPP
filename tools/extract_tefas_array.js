/* tools/extract_tefas_array.js 
mockData.js içinde 'TEFAS': [ ... ] dizisini bulur ve içindeki symbol/code alanlarını tools/tefas_symbols.txt'e yazar. 
Çalıştır: node .\tools\extract_tefas_array.js */ 
const fs = require('fs'); 
const path = require('path');

const mockPath = path.join(process.cwd(), 'src', 'shared', 'constants', 'mockData.js'); 
if (!fs.existsSync(mockPath)) { 
  console.error('ERROR: mockData.js bulunamadı:', mockPath); 
  process.exit(1); 
} 
const content = fs.readFileSync(mockPath, 'utf8');

// Corrected regex to match 'TEFAS': [ ... ]
const tefasRe = /['"]?TEFAS['"]?\s*:\s*\[([\s\S]*?)\]/gi; 
const found = new Set();

let m = tefasRe.exec(content); 
if (m && m[1]) { 
  const block = m[1]; 
  // Corrected regex to match symbol: 'XYZ' or code: 'XYZ'
  const symRe = /(?:symbol|code)\s*[:=]\s*['"]([^'"]+)['"]/gi; 
  let s; 
  while ((s = symRe.exec(block)) !== null) { 
    found.add(s[1].toUpperCase()); 
  } 
} else { 
  console.log('TEFAS dizisi otomatik bulunamadı; fallback olarak TEFAS bölgesindeki satırları listeliyorum.'); 
  const lines = content.split('\n'); 
  const ctx = []; 
  for (let i = 0; i < lines.length; i++) { 
    if (/TEFAS/i.test(lines[i])) { 
      for (let j = Math.max(0, i-3); j <= Math.min(lines.length-1, i+5); j++) { 
        ctx.push((j+1) + ':' + lines[j]); 
      } 
      ctx.push('---'); 
    } 
  } 
  console.log(ctx.join('\n')); 
}

const outDir = path.join(process.cwd(), 'tools'); 
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, 'tefas_symbols.txt'); 
fs.writeFileSync(outFile, Array.from(found).join('\n')); 
console.log('Found TEFAS symbols:', found.size); 
console.log('Saved to', outFile); 
if (found.size > 0) { 
  console.log('First items:', Array.from(found).slice(0, 200)); 
}
