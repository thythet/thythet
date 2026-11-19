'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createInstalledFontCatalog}=require('../pc-fonts.cjs');

test('PC font catalog is disabled in ordinary web/mac installations',async()=>{
  const c=createInstalledFontCatalog({platform:'darwin'});
  assert.deepEqual(c.scan(),[]);
  assert.equal(await c.read('Arial'),null);
});
test('registry enumeration returns installed font family and reads only registered font data',async()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'pspro-font-'));
  try{
    const fonts=path.join(tmp,'Windows','Fonts');
    fs.mkdirSync(fonts,{recursive:true});
    const sample=Buffer.alloc(160,7);
    fs.writeFileSync(path.join(fonts,'Sample.ttf'),sample);
    const execute=(_file,args)=>args[1].startsWith('HKLM')
      ?'   Sample Family (TrueType)     REG_SZ    Sample.ttf\n' : '';
    const c=createInstalledFontCatalog({platform:'win32',env:{WINDIR:path.join(tmp,'Windows'),LOCALAPPDATA:path.join(tmp,'Local')},execute});
    assert.deepEqual(c.scan(),['Sample Family']);
    assert.equal((await c.read('Sample Family')).bytes, sample.toString('base64'));
    assert.equal(await c.read('Unknown'),null);
    assert.equal(await c.read('..\\..\\private'),null);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
