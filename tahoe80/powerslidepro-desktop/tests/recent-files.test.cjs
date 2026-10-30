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

test('Home Recent button forwards the name field sent by the WASM editor', () => {
  assert.match(shell,/data\.action==='desktopOpen'[\s\S]*?openRecent\?\.\(String\(data\.name\|\|''\)\)/);
  assert.doesNotMatch(shell,/data\.action==='desktopOpen'[\s\S]{0,140}String\(data\.id\|\|''\)/);
});
