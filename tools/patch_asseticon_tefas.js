/** 
 * tools/patch_asseticon_tefas.js 
 * AssetIcon.js içinde: 
 * - import FundLogo ekler 
 * - useFundLogo değişkeni ekler 
 * - TEFAS bloğunu günceller 
 * - Render mantığını FundLogo'yu destekleyecek şekilde günceller 
 */ 
const fs = require('fs'); 
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'components', 'AssetIcon.js'); 
const bakPath = filePath + '.bak';

// Orijinal dosyayı yedekten geri yükle (temiz başlangıç için)
if (fs.existsSync(bakPath)) {
  fs.copyFileSync(bakPath, filePath);
}

let src = fs.readFileSync(filePath, 'utf8');

// 1) import FundLogo ekle 
if (!/import\s+FundLogo\s+from/.test(src)) { 
  src = src.replace(/(import\s+.*?from\s+['"]react-native['"];?\n)/, "$1import FundLogo from './FundLogo';\n"); 
}

// 2) let useFundLogo = false; ekle 
if (/let\s+imageUrl\s*=\s*null;/.test(src) && !/let\s+useFundLogo/.test(src)) { 
  src = src.replace(/(let\s+imageUrl\s*=\s*null;)/, "$1\n  let useFundLogo = false;"); 
}

// 3) TEFAS branch'ını güncelle 
const tefasRe = /(else\s+if\s*\(currentType\s*===\s*['"]TEFAS['"]\)\s*{)([\s\S]*?)(})/i; 
if (tefasRe.test(src)) { 
  src = src.replace(tefasRe, `$1\n    useFundLogo = true;\n    imageUrl = 'tefas_placeholder'; // Condition'ı geçmek için\n  $3`); 
}

// 4) Render kısmında FundLogo ekle 
const imageBlockRe = /if\s*\(imageUrl\s*&&\s*!imageError\)\s*{\s*return\s*\(\s*(<Image[\s\S]*?\/>)\s*\);\s*}/i;
if (imageBlockRe.test(src)) {
  src = src.replace(imageBlockRe, (match, imageTag) => {
    return `if ((imageUrl || useFundLogo) && !imageError) {
    if (useFundLogo) {
      return <FundLogo fund={asset} style={{ width: size, height: size, borderRadius: size / 2 }} />;
    }
    return (
      ${imageTag}
    );
  }`;
  });
}

fs.writeFileSync(filePath, src, 'utf8'); 
console.log('AssetIcon.js başarıyla güncellendi.');
