'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createUIFontPreferences,validUIFont}=require('../ui-font-prefs.cjs');

test('Tahoe80 UI font preference saves, survives reopening and resets',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'tahoe80-ui-font-'));
  try{
    const file=path.join(root,'prefs','ui-font.json');
    const a=createUIFontPreferences(()=>file);
    assert.equal(a.get(),'Default');
    assert.equal(a.set('Windows System'),true);
    const b=createUIFontPreferences(()=>file);
    assert.equal(b.get(),'Windows System');
    assert.equal(b.set('Segoe UI'),true);
    assert.equal(a.get(),'Segoe UI');
    assert.equal(a.set('macOS System'),true);
    assert.equal(b.get(),'macOS System');
    assert.equal(b.set('Inter'),true);
    assert.equal(a.get(),'Inter');
    assert.equal(a.set('Default'),true);
    assert.equal(b.get(),'Default');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('invalid choices fall back without modifying the previous choice',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'tahoe80-ui-font-'));
  try{
    const file=path.join(root,'prefs.json'), prefs=createUIFontPreferences(()=>file);
    assert.equal(prefs.set('Khmer OS Battambang'),true);
    for(const invalid of ['', ' ', '../etc/passwd', 'Font\\0Bad','a'.repeat(161),42,null]){
      assert.equal(validUIFont(invalid),false);
      assert.equal(prefs.set(invalid),false);
      assert.equal(prefs.get(),'Khmer OS Battambang');
    }
    fs.writeFileSync(file,'not JSON','utf8');
    assert.equal(prefs.get(),'Default');
    fs.writeFileSync(file,JSON.stringify({interfaceFont:'../unavailable'}),'utf8');
    assert.equal(prefs.get(),'Default');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
