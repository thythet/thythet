'use strict';
const fs = require('node:fs');
const path = require('node:path');
const tahoe = path.resolve(__dirname, '..', '..');
const output = path.resolve(__dirname, '..', 'payload', 'tahoe80');
const src = (relative) => path.join(tahoe, relative);
const dst = (relative) => path.join(output, relative);
function copy(relative) {
  if (!fs.existsSync(src(relative))) throw new Error('Missing Tahoe80 asset: ' + relative);
  fs.mkdirSync(path.dirname(dst(relative)), { recursive: true });
  fs.cpSync(src(relative), dst(relative), { recursive: true, force: true });
}
fs.rmSync(output, { recursive: true, force: true });
[
  'apps/deckcraft-web',
  'assets/fonts',
  'assets/js/powerslidepro-present-v1.js',
  'assets/powerslidepro-audience.html',
  'assets/powerslidepro-logo.png',
  'data/books'
].forEach(copy);
fs.copyFileSync(path.join(tahoe, 'powerslidepro-desktop', 'shell.html'), dst('index.html'));
const books = fs.readdirSync(dst('data/books')).filter((f) => f.endsWith('.json'));
const web = fs.readdirSync(dst('apps/deckcraft-web'));
const khmer = fs.readdirSync(dst('assets/fonts/khmer-os')).filter((f) => f.endsWith('.ttf'));
if (books.length !== 66) throw new Error('Expected 66 Bible books, got ' + books.length);
if (khmer.length < 40) throw new Error('Expected 40 Khmer OS fonts, got ' + khmer.length);
if (!web.some((f) => f.endsWith('_bg.wasm')) || !web.some((f) => f.endsWith('.js')))
  throw new Error('PowerSlidePro WebAssembly runtime is missing');
const html = fs.readFileSync(dst('apps/deckcraft-web/index.html'), 'utf8');
for (const script of html.matchAll(/['"]\.\/([^'" ]+\.js)['"]/g)) {
  if (!fs.existsSync(dst('apps/deckcraft-web/' + script[1])))
    throw new Error('Referenced module missing: ' + script[1]);
}
console.log('Offline bundle ready: WASM, ' + books.length + ' Bible books, ' +
  khmer.length + ' Khmer OS fonts.');
