/* PowerSlidePro Tahoe79 — browser-local font library. No cloud upload. */
(()=>{
'use strict';
const DB_NAME='PowerSlidePro-Fonts-v1';
const STORE='faces';
const MAX_BYTES=25*1024*1024;
const MAX_FACES=120;
const root=window;
let dbPromise;
const openDb=()=>dbPromise??=new Promise((resolve,reject)=>{
  if(!('indexedDB' in window)){reject(Error('This browser does not support persistent font storage.'));return;}
  const req=indexedDB.open(DB_NAME,1);
  req.onupgradeneeded=()=>req.result.createObjectStore(STORE,{keyPath:'key'});
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error('Font storage unavailable'));
});
async function readAll(){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).getAll();
    req.onsuccess=()=>resolve(req.result||[]);
    req.onerror=()=>reject(req.error);
  });
}
async function put(record){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });
}
async function remove(key){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });
}
function pushToEngine(record){
  const bytes=new Uint8Array(record.bytes);
  window.postMessage({type:'tahoe-font-data',source:'imported',name:record.name,bytes},location.origin,[bytes.buffer]);
}
async function restore(){
  try{for(const rec of await readAll())pushToEngine(rec);}
  catch(e){console.warn('PowerSlidePro font library:',e.message);}
}
function openManager(){
  if(document.getElementById('tahoe-font-overlay'))return;
  const overlay=document.createElement('div');
  overlay.id='tahoe-font-overlay';
  overlay.style.cssText='position:fixed;z-index:2147483000;inset:0;display:grid;place-items:center;background:#0d172340;backdrop-filter:blur(4px);font:12px Inter,system-ui,sans-serif;color:#263445';
  const panel=document.createElement('section');
  panel.style.cssText='width:min(410px,calc(100vw - 25px));max-height:min(650px,90vh);overflow:auto;padding:17px;background:#fff;border-radius:14px;box-shadow:0 20px 55px #0003';
  const head=document.createElement('div');
  head.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:14px';
  const title=document.createElement('strong');title.textContent='Font Manager';title.style.fontSize='15px';
  const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Close');
  close.style.cssText='font-size:22px;border:0;background:none;cursor:pointer;color:#637184';
  close.onclick=()=>overlay.remove();head.append(title,close);
  const drop=document.createElement('label');
  drop.style.cssText='display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100px;border:1px dashed #99b3d4;border-radius:10px;background:#f6f9fc;cursor:pointer;gap:8px';
  drop.textContent='Drop .TTF / .OTF fonts here, or click to browse';
  const input=document.createElement('input');input.type='file';input.multiple=true;input.accept='.ttf,.otf,font/ttf,font/otf';input.hidden=true;
  drop.append(input);
  const info=document.createElement('div');info.setAttribute('role','status');info.style.cssText='margin:9px 0;color:#687990;font-size:11px';
  const list=document.createElement('div');list.style.cssText='display:flex;flex-direction:column;gap:6px';
  const addButton=(text,callback)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.style.cssText='border:1px solid #dee4eb;border-radius:7px;background:#fff;padding:4px 9px;cursor:pointer';b.onclick=callback;return b};
  async function refresh(){
    try{
      list.replaceChildren();
      const records=await readAll();
      info.textContent=records.length+' imported fonts — stored in this browser only';
      for(const r of records){
        const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:8px;padding:6px 3px;border-bottom:1px solid #eef0f4';
        const name=document.createElement('span');name.textContent=r.name;name.style.cssText='flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis';
        row.append(name,addButton('Remove',async()=>{await remove(r.key);await refresh();info.textContent='Removed. Reopen PowerSlidePro to unload this font.'}));
        list.append(row);
      }
    }catch(error){info.textContent='Font storage unavailable: '+error.message;}
  }
  async function importFiles(files){
    const array=Array.from(files||[]).slice(0,MAX_FACES);
    const existing=await readAll();
    if(existing.length+array.length>MAX_FACES) {info.textContent='Maximum of 120 imported fonts.';return;}
    for(const file of array){
      if(!/\.(ttf|otf)$/i.test(file.name)||file.size>MAX_BYTES||file.size<100){
        info.textContent='Rejected '+file.name+': use a .ttf or .otf under 25 MB.';continue;
      }
      const bytes=await file.arrayBuffer();
      const header=new DataView(bytes).getUint32(0,false);
      if(![0x00010000,0x4f54544f,0x74727565].includes(header)){
        info.textContent='Rejected '+file.name+': invalid TrueType/OpenType header.';continue;
      }
      const record={key:file.name.toLowerCase(),name:file.name,bytes};
      try{await put(record);pushToEngine(record);}
      catch(error){info.textContent='Could not store '+file.name+': '+error.message;}
    }
    await refresh();
  }
  input.onchange=()=>void importFiles(input.files).finally(()=>input.value='');
  drop.ondragover=e=>{e.preventDefault();drop.style.background='#e4effe';};
  drop.ondragleave=()=>{drop.style.background='#f6f9fc';};
  drop.ondrop=e=>{e.preventDefault();drop.style.background='#f6f9fc';void importFiles(e.dataTransfer.files);};
  overlay.onclick=e=>{if(e.target===overlay)overlay.remove();};
  panel.append(head,drop,info,list);overlay.append(panel);document.body.append(overlay);
  void refresh();
}
window.tahoeFontManager=openManager;
window.tahoeFontRequest=family=>{
  if(typeof family!=='string'||family.length>160)return;
  if(window.parent!==window)window.parent.postMessage({type:'tahoe-font-need',family},location.origin);
};
// The app owns these 40 offline Khmer OS font files. Select and load an
// individual face even before background preloading has completed.
window.tahoeBundledFontRequest=family=>{
  if(typeof family!=='string'||family.length>160)return;
  window.postMessage({type:'tahoe-font-bundled',family},location.origin);
};
window.tahoeFontRescan=()=>{
  if(window.parent!==window)window.parent.postMessage({type:'tahoe-font-rescan'},location.origin);
};
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==window)return;
  if(event.data?.type==='tahoe-font-ready')void restore();
});
})();