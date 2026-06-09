import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const distFile = path.join(repoRoot, 'dist', 'embed-build', 'v1.js');
const outDir = path.join(repoRoot, 'dist', 'embed');
const outFile = path.join(outDir, 'v1.js');

let code = fs.readFileSync(distFile, 'utf8');
code = code.replace(/^export\s*\{[^}]*\}\s*;?\s*$/m, '');
code = code.replace(/^import\s+.*?;?\s*$/gm, '');
code = `(function(){\n'use strict';\n${code}\n})();`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, code);
console.log(`Bundled embed SDK → ${outFile}`);
