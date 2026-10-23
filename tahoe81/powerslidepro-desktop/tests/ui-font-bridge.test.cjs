'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

test('Electron bridge restores persisted desktop default and acknowledges disk writes',()=>{
  const source=read('shell.html');
  const preload=read('preload.cjs');
  const main=read('main.cjs');
  assert.match(source,/tahoe-font-ready/);
  assert.match(source,/host\?\.getUIFont\?\.\(\)/);
  assert.match(source,/tahoe-ui-font-restore/);
  assert.match(source,/tahoe-ui-font-preference/);
  assert.match(source,/await host\?\.setUIFont\?\.\(data\.family\)/);
  assert.match(source,/tahoe-ui-font-saved/);
  assert.doesNotMatch(source,/void host\?\.setUIFont\?\.\(data\.family\)/,
    'The old fire-and-forget save cannot report failure');
  assert.match(preload,/getUIFont:\s*\(\)\s*=>\s*ipcRenderer\.invoke\('pspro:ui-font-get'\)/);
  assert.match(preload,/setUIFont:\s*family\s*=>\s*ipcRenderer\.invoke\('pspro:ui-font-set', family\)/);
  assert.match(main,/pspro:ui-font-get/);
  assert.match(main,/pspro:ui-font-set/);
  assert.match(main,/uiFontPrefs\.get\(\)/);
  assert.match(main,/uiFontPrefs\.set\(name\)/);
});
test('Preview never automatically persists interface font; save action originates in Preferences',()=>{
  const source=read('shell.html');
  assert.match(source,/desktop=1/);
  assert.match(source,/macui=1/);
  assert.match(source,/winui=1/);
  // The only IPC set belongs to a user-initiated preference message.
  const start=source.indexOf("data.type==='tahoe-ui-font-preference'");
  const end=source.indexOf("data.type==='tahoe-font-need'");
  assert.ok(start>0&&end>start);
  const action=source.slice(start,end);
  assert.match(action,/await host\?\.setUIFont\?\.\(data\.family\)/);
  assert.match(action,/success/);
});
