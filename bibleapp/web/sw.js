/* Bible App offline cache: Scripture is cache-first; UI shell is network-first on reconnect. */
const CACHE="bibleapp-web-v0.3.3";
const CORE=["./","./index.html","./style.css","./i18n.js","./firebase-config.js","./app.js","./cloud-auth.js","./software.js","./search-worker.js","./manifest.webmanifest","./data/manifest.json","./assets/icon-192.png","./assets/icon-512.png","./assets/aba_mobile_1795149283438.png","./assets/fonts/khmer-os/KhmerOSbattambang.ttf","./assets/fonts/khmer-os/KhmerOSBattambang-Bold.ttf"];
const SHELL_FILES=new Set(["index.html","app.js","i18n.js","firebase-config.js","cloud-auth.js","style.css"]);
self.addEventListener("install",e=>e.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(CORE);
  const manifest=await (await cache.match("./data/manifest.json")).json();
  await Promise.all(manifest.books.map(async book=>{
    const path="./data/books/"+book.id+".json";
    try{await cache.add(path)}catch(err){console.warn("Could not cache Bible book",path,err)}
  }));
  await self.skipWaiting();
})()));
self.addEventListener("activate",e=>e.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith("bibleapp-web-")&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
})()));
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  const url=new URL(e.request.url);
  if(url.origin!==self.location.origin)return;
  const cacheFirst=!((e.request.mode==="navigate")||SHELL_FILES.has(url.pathname.split("/").pop()));
  e.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    if(cacheFirst){const hit=await cache.match(e.request);if(hit)return hit}
    try{
      const response=await fetch(e.request);
      if(response.ok)cache.put(e.request,response.clone()).catch(()=>{});
      return response;
    }catch{
      const fallback=await cache.match(e.request,{ignoreSearch:e.request.mode==="navigate"});
      return fallback||Response.error();
    }
  })());
});
