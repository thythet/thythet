const SHELL='tahoe79-shell-v5-generator-paste',RUNTIME='tahoe79-runtime-v5-generator-paste';
const CORE=['./','index.html','manifest.webmanifest','data/manifest.json','assets/icon-192.png','assets/icon-512.png','assets/powerslide-icon.svg','apps/bible/index.html','apps/powerslide/index.html','apps/powerslide-next/powerslide-next.css','apps/powerslide-next/powerslide-next.js','apps/bible-next/bible-next.css','apps/bible-next/bible-next.js','apps/bible-next/search-worker.js','apps/allsong-next/allsong-next.css','apps/allsong-next/allsong-next.js','data/songs/manifest.json','assets/powerslidepro-logo.png','apps/deckcraft-web/index.html','apps/deckcraft-web/font-manager.js','apps/deckcraft-web/generator-paste.js','assets/fonts/fonts.json','apps/deckcraft-web/song-library/songs.json','apps/deckcraft-web/song-library/allsong2.json','apps/deckcraft-web/song-library/allsong3.json','assets/powerslidepro-audience.html','assets/js/powerslidepro-present-v1.js','assets/js/powerslidepro-downloads.js','assets/js/powerslidepro-live-v1.js','assets/js/thechat-native-shell-v1.js','assets/js/posts-embed-v1.js','assets/js/listenword-embed-v1.js','assets/wallpaper-default.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(SHELL).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('tahoe79-shell-')||k.startsWith('tahoe79-runtime-')||k.startsWith('tahoe79-shared-bible-')||(k.startsWith('tahoe79-powerslidepro-immutable-')&&k!==PSPRO_ASSETS))&&!([SHELL,RUNTIME,BIBLE_CACHE].includes(k))).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
async function stale(req){const c=await caches.open(RUNTIME),hit=await c.match(req);const net=fetch(req).then(r=>{if(r.ok)c.put(req,r.clone());return r}).catch(()=>null);return hit||await net||Response.error()}
async function cacheFirstBible(req){const c=await caches.open(BIBLE_CACHE),hit=await c.match(req);if(hit)return hit;const r=await fetch(req);if(r.ok)c.put(req,r.clone());return r}
async function cacheFirst(req){const c=await caches.open(RUNTIME),hit=await c.match(req);if(hit)return hit;const r=await fetch(req);if(r.ok)c.put(req,r.clone());return r}

/* Compiled PowerSlidePro files have content-hashed names. Never re-download an
   unchanged ~39 MB WASM module just because the editor iframe reopened. Keep
   these assets across regular Tahoe shell releases, unlike the volatile runtime. */
const PSPRO_ASSETS='tahoe79-powerslidepro-immutable-v3';
const psproPending=new Map();
async function psproAsset(req){
  const cache=await caches.open(PSPRO_ASSETS), hit=await cache.match(req);
  if(hit)return hit;
  let pending=psproPending.get(req.url);
  if(!pending){
    pending=fetch(req,{cache:'reload'}).then(response=>{
      if(response.ok){
        cache.put(req,response.clone()).then(async()=>{
          const keys=await cache.keys();
          if(keys.length>6)await Promise.all(keys.slice(0,keys.length-6).map(k=>cache.delete(k)));
        }).catch(()=>{}).finally(()=>psproPending.delete(req.url));
      }else psproPending.delete(req.url);
      return response;
    }).catch(err=>{psproPending.delete(req.url);throw err});
    psproPending.set(req.url,pending);
  }
  return (await pending).clone();
}
async function networkFirst(req){const c=await caches.open(RUNTIME);try{const r=await fetch(req,{cache:'no-cache'});if(r.ok)c.put(req,r.clone());return r}catch{const hit=await c.match(req);return hit||Response.error()}}

const BIBLE_CACHE='tahoe79-shared-bible-v79';
async function bibleManifest(){const c=await caches.open(RUNTIME),url=new URL('data/manifest.json',self.location.href).href,hit=await c.match(url);if(hit)return hit.json();return fetch(url).then(r=>r.json())}
async function bibleStatus(){const c=await caches.open(BIBLE_CACHE),keys=await c.keys();return keys.filter(r=>new URL(r.url).pathname.includes('/data/books/')).length}
self.addEventListener('message',e=>{const m=e.data||{},port=e.ports?.[0];if(m.type==='BIBLE_STATUS')e.waitUntil(bibleStatus().then(count=>port?.postMessage({ok:true,count})));if(m.type==='CLEAR_BIBLE')e.waitUntil(caches.delete(BIBLE_CACHE).then(()=>caches.open(BIBLE_CACHE)).then(()=>port?.postMessage({ok:true,count:0})));if(m.type==='CACHE_ALL_BIBLE')e.waitUntil((async()=>{const mf=await bibleManifest(),list=mf.books||[],c=await caches.open(BIBLE_CACHE);let done=0;for(const b of list){const req=new Request(new URL('data/books/'+b.id+'.json',self.location.href).href);if(!await c.match(req)){const r=await fetch(req);if(!r.ok)throw Error(b.id);await c.put(req,r.clone())}done++;port?.postMessage({type:'PROGRESS',done,total:list.length})}port?.postMessage({ok:true,count:list.length})})().catch(err=>port?.postMessage({ok:false,error:String(err.message||err)})))})

self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==location.origin)return;if(e.request.mode==='navigate')return e.respondWith(networkFirst(e.request));if(u.pathname.includes('/data/books/'))return e.respondWith(cacheFirstBible(e.request));if(/\/apps\/deckcraft-web\/deckcraft-web-[a-f0-9]+(?:_bg)?\.(?:js|wasm)$/i.test(u.pathname))return e.respondWith(psproAsset(e.request));if(/\.(?:js|css|json|png|jpg|jpeg|webp|svg|woff2?|ttf|wasm)$/i.test(u.pathname)||u.pathname.endsWith('/')||u.pathname.endsWith('.html'))e.respondWith(stale(e.request))});
