const APP='tahoe79-powerslide-app-v1',BIBLE='tahoe79-shared-bible-v1',RUNTIME='tahoe79-powerslide-runtime-v1';
const DATA=new URL('../../data/',self.location.href).href;
const ASSETS=new URL('../../assets/',self.location.href).href;
const SHELL=[
  './','index.html','powerslide.js?v=46','powerslide.css?v=46','manifest.webmanifest',
  ASSETS+'icon-192.png',ASSETS+'icon-512.png',ASSETS+'powerslide-icon.svg',
  ASSETS+'fonts/fonts.json',
  DATA+'manifest.json'
];
self.addEventListener('install',e=>e.waitUntil(
  caches.open(APP).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())
));
self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>
    (/^tahoe79-powerslide-/.test(k)&&![APP,BIBLE,RUNTIME].includes(k))
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
