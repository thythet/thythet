const APP='tahoe-bible-app-v53',BIBLE='tahoe-shared-bible-v53',RUNTIME='tahoe-bible-runtime-v53';
const DATA=new URL('../../data/',self.location.href).href;
const ASSETS=new URL('../../assets/',self.location.href).href;
const SHELL=[
  './','index.html','app.js?v=46','manifest.webmanifest','search-worker.js',
  ASSETS+'icon-192.png',ASSETS+'icon-512.png',ASSETS+'powerslide-icon.svg',
  ASSETS+'fonts/fonts.json',ASSETS+'fonts/SONYHEAD5-Regular.ttf',
  DATA+'manifest.json'
];
self.addEventListener('install',e=>e.waitUntil(
  caches.open(APP).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())
));
self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>
    (/^(tahoe-bible-|kb1954-)/.test(k)&&![APP,BIBLE,RUNTIME].includes(k))
  ).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));
async function cacheFirst(req,name){
  const c=await caches.open(name),hit=await c.match(req);
  if(hit)return hit;
  const r=await fetch(req);
  if(r.ok||r.type==='opaque')c.put(req,r.clone());
  return r
}
async function stale(req,name){
  const c=await caches.open(name),hit=await c.match(req);
  const net=fetch(req).then(r=>{if(r.ok||r.type==='opaque')c.put(req,r.clone());return r}).catch(()=>null);
  return hit||await net||Response.error()
}
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin===location.origin){
    if(u.pathname.includes('/data/books/'))return e.respondWith(cacheFirst(e.request,BIBLE));
    return e.respondWith(stale(e.request,APP))
  }
  if(['fonts.googleapis.com','fonts.gstatic.com','thythet.com','www.gstatic.com','cdn.jsdelivr.net'].includes(u.hostname))
    e.respondWith(cacheFirst(e.request,RUNTIME))
});
async function manifest(){
  const c=await caches.open(APP),url=DATA+'manifest.json',hit=await c.match(url);
  if(hit)return hit.json();
  return fetch(url).then(r=>r.json())
}
async function status(){
  const c=await caches.open(BIBLE),keys=await c.keys();
  return keys.filter(r=>new URL(r.url).pathname.includes('/data/books/')).length
}
self.addEventListener('message',e=>{
  const m=e.data||{},port=e.ports?.[0];
  if(m.type==='BIBLE_STATUS')e.waitUntil(status().then(count=>port?.postMessage({ok:true,count})));
  if(m.type==='CLEAR_BIBLE')e.waitUntil(
    caches.delete(BIBLE).then(()=>caches.open(BIBLE)).then(()=>port?.postMessage({ok:true,count:0}))
  );
  if(m.type==='CACHE_ALL_BIBLE')e.waitUntil((async()=>{
    const mf=await manifest(),list=mf.books||[],c=await caches.open(BIBLE);let done=0;
    for(const b of list){
      const req=new Request(DATA+'books/'+b.id+'.json');
      if(!await c.match(req)){
        const r=await fetch(req);if(!r.ok)throw Error(b.id);await c.put(req,r.clone())
      }
      done++;port?.postMessage({type:'PROGRESS',done,total:list.length})
    }
    port?.postMessage({ok:true,count:list.length})
  })().catch(err=>port?.postMessage({ok:false,error:String(err.message||err)})))
});
