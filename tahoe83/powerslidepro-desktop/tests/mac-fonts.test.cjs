'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {createMacFontCatalog,fontFamilies}=require('../mac-fonts.cjs');

test('Tahoe80 macOS font catalog loads only scanned font families',async()=>{
  const root=path.join(__dirname,'..','payload','tahoe80','assets','fonts','khmer-os');
  const files=fs.readdirSync(root).filter(f=>/\.ttf$/i.test(f));
  assert.ok(files.length>=40,'40+ bundled Khmer OS fonts survive staging');
  const face=fontFamilies(path.join(root,files[0]));
  assert.ok(face.length>0,'TrueType/OpenType family metadata parsed');
  const catalog=createMacFontCatalog({platform:'darwin',dirs:[root]});
  const families=catalog.scan();
  assert.ok(families.length>0,'macOS family list available');
  const read=await catalog.read(families[0]);
  assert.ok(read?.bytes?.length>100,'recognized face bytes are returned');
  assert.equal(await catalog.read('../../etc/passwd'),null,'no filesystem path access');
  assert.equal(await catalog.read('nonexistent-family'),null);
  const windows=createMacFontCatalog({platform:'win32',dirs:[root]});
  assert.deepEqual(windows.scan(),[],'Mac catalog disabled on Windows');
});
