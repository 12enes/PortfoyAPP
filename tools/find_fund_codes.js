/* tools/find_fund_codes.js */
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

const codeSet = new Set();
const patterns = [
  /icon\/([A-Z0-9_-]+)\.webp/gi,
  /"code"\s*:\s*"([A-Z0-9_-]+)"/gi,
  /'code'\s*:\s*'([A-Z0-9_-]+)'/gi,
  /institution_slug["']?\s*[:=]\s*["']?([A-Za-z0-9_-]+)["']?/gi,
  /"slug"\s*:\s*"([A-Za-z0-9_-]+)"/gi
];

const exts = ['.js', '.jsx', '.ts', '.tsx', '.json', '.html'];

walk(process.cwd(), file => {
  if (!exts.includes(path.extname(file))) return;
  try {
    const content = fs.readFileSync(file, 'utf8');
    patterns.forEach(re => {
      let m;
      while ((m = re.exec(content)) !== null) {
        const code = m[1].trim();
        if (code) codeSet.add(code);
      }
    });
  } catch (e) {}
});

const out = Array.from(codeSet).sort();
fs.writeFileSync('tools/fund_codes.txt', out.join('\n'));
console.log('Found codes:', out.length);
console.log('Saved to tools/fund_codes.txt');
