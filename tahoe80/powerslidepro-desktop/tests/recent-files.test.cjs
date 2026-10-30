'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const main = fs.readFileSync(path.join(__dirname, '..', 'main.cjs'), 'utf8');
const shell = fs.readFileSync(path.join(__dirname, '..', 'shell.html'), 'utf8');

test('Recent selection accepts numeric file IDs and forwards existing local files', () => {
  const match = main.match(/function queueRecentByIndex\(index\) \{[\s\S]*?\n\}/);
  assert.ok(match, 'queueRecentByIndex must exist');
  const existing = '/home/example/4545.deckcraft';
  let queued = null;
  const open = new Function('recentFiles', 'fs', 'queueDeckcraftFile',
    match[0] + '\nreturn queueRecentByIndex;')(
      [{path:existing}], {existsSync: p => p === existing},
      p => {queued=p;return true;}
    );
  assert.equal(open('0'), true);
  assert.equal(queued, existing);
  assert.equal(open('not-a-number'), false);
  assert.equal(open('20'), false);
});

test('Recent list publishes the last-opened timestamp for newest-first sorting', () => {
  const match=main.match(/function recentPublicList\(\) \{[\s\S]*?\n\}/);
  assert.ok(match, 'recentPublicList must exist');
  const list = new Function('recentFiles','fs',match[0]+'\nreturn recentPublicList;')(
    [
      {path:'/demo/new.deckcraft',name:'new.deckcraft',openedAt:'2026-10-30T16:30:00.000Z'},
      {path:'/demo/old.deckcraft',name:'old.deckcraft',openedAt:'2026-10-29T16:30:00.000Z'}
    ],{existsSync:()=>true})();
  assert.ok(list[0].openedAtMs > list[1].openedAtMs);
  assert.deepEqual(list.map(x=>x.name),['new.deckcraft','old.deckcraft']);
});

test('Open File Location uses a valid recent ID and only reveals its stored path', () => {
  const match=main.match(/function revealRecentByIndex\(index\) \{[\s\S]*?\n\}/);
  assert.ok(match, 'revealRecentByIndex must exist');
  let revealed='';
  const reveal=new Function('recentFiles','fs','shell',match[0]+'\nreturn revealRecentByIndex;')(
    [{path:'/demo/new.deckcraft'}],
    {statSync: p=>({isFile:()=>p==='/demo/new.deckcraft'})},
    {showItemInFolder: p=>{revealed=p}});
  assert.equal(reveal('0'),true);
  assert.equal(revealed,'/demo/new.deckcraft');
  assert.equal(reveal('../fake.deckcraft'),false);
  assert.equal(reveal('99'),false);
});

test('Home Recent button forwards the name field sent by the WASM editor', () => {
  assert.match(shell,/data\.action==='desktopOpen'[\s\S]*?openRecent\?\.\(String\(data\.name\|\|''\)\)/);
  assert.doesNotMatch(shell,/data\.action==='desktopOpen'[\s\S]{0,140}String\(data\.id\|\|''\)/);
  assert.match(shell,/data\.action==='desktopReveal'[\s\S]*?revealRecent\?\.\(String\(data\.name\|\|''\)\)/);
});
