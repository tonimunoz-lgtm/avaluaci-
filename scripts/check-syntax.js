// Comprova la sintaxi de tots els .js del projecte (mòduls ES i scripts clàssics)
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const skip = new Set(['node_modules', '.git', 'rules-tests', 'tests']);
let failed = 0;
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    if (skip.has(f)) continue;
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.js')) {
      const src = fs.readFileSync(p, 'utf8');
      const isModule = /^\s*(import|export)\s/m.test(src);
      try {
        execFileSync('node', isModule ? ['--input-type=module', '--check'] : ['--check', p],
          { input: isModule ? src : undefined, stdio: ['pipe', 'pipe', 'pipe'] });
      } catch (e) { failed++; console.error('✗', path.relative(root, p), '\n', String(e.stderr).split('\n').slice(0, 4).join('\n')); }
    }
  }
}
walk(root);
if (failed) { console.error(failed + ' fitxer(s) amb errors'); process.exit(1); }
console.log('✓ Sintaxi correcta');
