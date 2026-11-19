'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {createDesktopUpdater,GITHUB_PROVIDER}=require('../updater.cjs');

function harness(platform='win32', packaged=true) {
  const updater=new EventEmitter();
  updater.checkForUpdates=async()=>{updater.emit('checking-for-update');updater.emit('update-available',{version:'0.1.4'});};
  updater.downloadUpdate=async()=>{updater.emit('download-progress',{percent:61});updater.emit('update-downloaded',{version:'0.1.4'});};
  updater.quitAndInstall=(...args)=>{updater.installedWith=args;};
  updater.setFeedURL=config=>{updater.feed=config;};
  const notifications=[];
  let response=0;
  const manager=createDesktopUpdater({
    app:{getVersion:()=> '0.1.3',isPackaged:packaged},
    dialog:{showMessageBox:async()=>({response})},
    platform,updater,getWindow:()=>null,notify:s=>notifications.push(s)
  });
  return {manager,updater,notifications,permitInstall:()=>response=1};
}
test('Windows updater checks GitHub, never downloads automatically',async()=>{
  const {manager,updater}=harness();
  assert.equal(manager.supported,true);
  assert.deepEqual(updater.feed,GITHUB_PROVIDER);
  assert.equal(updater.autoDownload,false);
  assert.equal(updater.autoInstallOnAppQuit,false);
  await manager.check({manual:true});
  assert.equal(manager.status().phase,'available');
  assert.equal(manager.status().version,'0.1.4');
  assert.equal(updater.installedWith,undefined);
});
test('download requires explicit invocation; installation requires user approval',async()=>{
  const {manager,updater,permitInstall}=harness();
  await manager.check();
  await manager.download();
  assert.equal(manager.status().phase,'ready');
  assert.equal(await manager.install(),false);
  assert.equal(updater.installedWith,undefined);
  permitInstall();
  assert.equal(await manager.install(),true);
  assert.deepEqual(updater.installedWith,[false,true]);
});
test('Mac and unpackaged app never request automatic installer',async()=>{
  for(const [platform,packaged] of [['darwin',true],['win32',false]]) {
    const {manager,updater}=harness(platform,packaged);
    assert.equal(manager.supported,false);
    assert.equal(manager.status().phase,'unsupported');
    await manager.check();
    assert.equal(updater.feed,undefined);
  }
});
test('offline update error is nonfatal',async()=>{
  const {manager,updater}=harness();
  updater.checkForUpdates=async()=>{throw Error('No internet');};
  await manager.check({manual:true});
  assert.equal(manager.status().phase,'error');
});
