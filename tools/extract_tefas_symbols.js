/* tools/extract_tefas_symbols.js 
mockData.js içinde type: 'TEFAS' olan objelerden symbol/code alanlarını bulur. 
Çalıştır: node .\tools\extract_tefas_symbols.js */ 
const fs = require('fs'); 
const path = require('path');

const mockPath = path.join(process.cwd(), 'src', 'shared', 'constants', 'mockData.js'); 
if (!fs.existsSync(mockPath)) { 
  console.error('ERROR: mockData.js bulunamadı:', mockPath); 
  process.exit(1); 
} 
const content = fs.readFileSync(mockPath, 'utf8');

// regex ile type: 'TEFAS' geçen her yeri bul ve etrafındaki 400 karakter içinde symbol veya code ara 
const typeRe = /type\s*:\s*['"]TEFAS['"]/gi; 
const symRe = /symbol\s*[:=]\s*['"]([^'"]+)['"]/i; 
const codeRe = /code\s*[:=]\s*['"]([^'"]+)['"]/i; 
const found = new Set();

let m; 
while ((m = typeRe.exec(content)) !== null) { 
  const idx = m.index; 
  const window = content.slice(Math.max(0, idx - 400), Math.min(content.length, idx + 400)); 
  const symMatch = window.match(symRe); 
  const codeMatch = window.match(codeRe); 
  if (symMatch && symMatch[1]) { 
    found.add(symMatch[1].toUpperCase()); 
  } else if (codeMatch && codeMatch[1]) { 
    found.add(codeMatch[1].toUpperCase()); 
  } else { 
    // Eğer symbol/code bulunmadıysa, objenin tamamını yakalamaya çalış (en yakın '{' ve '}') 
    const objStart = content.lastIndexOf('{', idx); 
    const objEnd = content.indexOf('}', idx); 
    if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) { 
      const objText = content.slice(objStart, objEnd + 1); 
      const s1 = objText.match(symRe); 
      const s2 = objText.match(codeRe); 
      if (s1 && s1[1]) found.add(s1[1].toUpperCase()); 
      else if (s2 && s2[1]) found.add(s2[1].toUpperCase()); 
    } 
  } 
}

// Eğer hiç bulunamadıysa ayrıca mockData içinde "TEFAS" geçen satırları ve nearby symbol satırlarını yazdır 
const outDir = path.join(process.cwd(), 'tools'); 
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, 'tefas_symbols.txt'); 
fs.writeFileSync(outFile, Array.from(found).join('\n')); 
console.log('Found TEFAS symbols:', found.size); 
console.log('Saved to', outFile); 

if (found.size > 0) { 
  console.log('First items:', Array.from(found).slice(0, 200)); 
} else { 
  // fallback: list TEFAS-context lines for manual check 
  const lines = content.split('\n'); 
  const ctx = []; 
  for (let i = 0; i < lines.length; i++) { 
    if (/TEFAS/i.test(lines[i])) { 
      ctx.push((i+1) + ':' + lines[i].trim()); 
      // add next 3 lines to help find symbol 
      if (i+1 < lines.length) ctx.push((i+2) + ':' + lines[i+1].trim()); 
      if (i+2 < lines.length) ctx.push((i+3) + ':' + lines[i+2].trim()); 
    } 
  } 
  console.log('No symbols auto-detected. Nearby TEFAS lines (line:content):\n' + ctx.join('\n')); 
}
