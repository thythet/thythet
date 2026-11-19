'use strict';
// Tahoe80: macOS installed fonts. Read only font files discovered in OS font
// directories; the renderer can request a family name, never a filesystem path.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const EXT = /\.(?:ttf|otf|ttc|otc)$/i;
const MAX_FILE = 45 * 1024 * 1024;
const MAX_ENTRIES = 6000;
function fontDirectories(home = os.homedir()) {
  return ['/System/Library/Fonts', '/Library/Fonts', path.join(home, 'Library/Fonts')];
}
function readAt(fd, offset, size) {
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(size) || size < 0 || size > 256 * 1024) return null;
  const b = Buffer.alloc(size);
  return fs.readSync(fd, b, 0, size, offset) === size ? b : null;
}
function readNameTable(fd, offset) {
  const head = readAt(fd, offset, 12);
  if (!head) return [];
  const tables = head.readUInt16BE(4);
  if (tables < 1 || tables > 128) return [];
  const entries = readAt(fd, offset + 12, tables * 16);
  if (!entries) return [];
  for (let i = 0; i < tables; i++) {
    const p = i * 16;
    if (entries.toString('ascii', p, p + 4) !== 'name') continue;
    const tableAt = entries.readUInt32BE(p + 8); // TTC offsets are file-relative.
    const length = entries.readUInt32BE(p + 12);
    if (length < 6 || length > 256 * 1024) return [];
    const names = readAt(fd, tableAt, length);
    if (!names) return [];
    const count = names.readUInt16BE(2);
    const stringsAt = names.readUInt16BE(4);
    if (count > 2500 || 6 + count * 12 > names.length) return [];
    const candidates = [];
    for (let j = 0; j < count; j++) {
      const q = 6 + j * 12;
      const platform = names.readUInt16BE(q), language = names.readUInt16BE(q + 4), kind = names.readUInt16BE(q + 6);
      if (kind !== 1 && kind !== 16) continue;
      const size = names.readUInt16BE(q + 8), start = stringsAt + names.readUInt16BE(q + 10);
      if (size < 2 || start + size > names.length) continue;
      let text;
      if ((platform === 3 || platform === 0) && size % 2 === 0) {
        text = Buffer.from(names.subarray(start, start + size)).swap16().toString('utf16le');
      } else if (platform === 1) {
        text = names.toString('latin1', start, start + size);
      } else continue;
      text = text.replace(/[\u0000-\u001F]/g, '').trim();
      if (text && text.length <= 160) candidates.push({text, score:(kind === 16 ? 10 : 0) + (language === 0x409 ? 2 : 0) + (platform === 3 ? 1 : 0)});
    }
    candidates.sort((a,b) => b.score - a.score);
    return [...new Set(candidates.map(c => c.text))].slice(0, 4);
  }
  return [];
}
function fontFamilies(file) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const first = readAt(fd, 0, 12);
    if (!first) return [];
    let offsets = [0];
    if (first.toString('ascii', 0, 4) === 'ttcf') {
      const count = first.readUInt32BE(8);
      if (count < 1 || count > 100) return [];
      const data = readAt(fd, 12, count * 4);
      if (!data) return [];
      offsets = Array.from({length:count}, (_,i)=>data.readUInt32BE(i*4));
    }
    return [...new Set(offsets.flatMap(o => readNameTable(fd,o)))];
  } catch (_) { return []; }
  finally { if (fd !== undefined) fs.closeSync(fd); }
}
function createMacFontCatalog({platform=process.platform, dirs=fontDirectories()}={}) {
  const roots = dirs.map(d=>path.resolve(d));
  let cache = new Map();
  function scan() {
    if (platform !== 'darwin') { cache=new Map(); return []; }
    const catalog = new Map(), pending = roots.map(d=>[d,0]);
    let visited=0;
    while (pending.length && visited < MAX_ENTRIES) {
      const [dir, depth] = pending.shift();
      let entries;
      try { entries = fs.readdirSync(dir, {withFileTypes:true}); } catch (_) { continue; }
      for (const entry of entries) {
        if (++visited > MAX_ENTRIES) break;
        const filename=path.join(dir,entry.name);
        if (entry.isDirectory() && depth < 2) { pending.push([filename,depth+1]); continue; }
        if (!entry.isFile() || !EXT.test(entry.name)) continue;
        try {
          const st=fs.statSync(filename);
          if (st.size<100 || st.size>MAX_FILE) continue;
          for (const name of fontFamilies(filename)) {
            const key=name.toLocaleLowerCase('en');
            if (!catalog.has(key)) catalog.set(key,{name,path:filename});
          }
        } catch (_) { /* inaccessible system face */ }
      }
    }
    cache=catalog;
    return [...cache.values()].map(v=>v.name).sort((a,b)=>a.localeCompare(b));
  }
  async function read(family) {
    if (typeof family !== 'string' || family.length > 160) return null;
    const entry=cache.get(family.toLocaleLowerCase('en'));
    if (!entry) return null;
    try {
      const real=await fs.promises.realpath(entry.path);
      const inRoot=roots.some(r=>real.startsWith(r+path.sep));
      if (!inRoot || !EXT.test(real)) return null;
      const st=await fs.promises.stat(real);
      if (!st.isFile() || st.size<100 || st.size>MAX_FILE) return null;
      return {name:entry.name,bytes:(await fs.promises.readFile(real)).toString('base64')};
    } catch (_) {return null;}
  }
  return {scan,read};
}
module.exports={createMacFontCatalog,fontDirectories,fontFamilies};
