const CACHE='lovekid-shell-v1';const SHELL=['./','./index.html','./dashboard.html','./themes.css','./effects.css','./theme-switcher.js','./effect-switcher.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('lovekid-shell-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;const u=new URL(req.url);if(u.pathname.includes('/chat/')||u.pathname.includes('/firebase')||u.pathname.endsWith('/sw.js'))return;
if(req.mode==='navigate'){event.respondWith(fetch(req).catch(()=>caches.match(req)));return;}
event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res.ok&&res.type==='basic'){const clone=res.clone();caches.open(CACHE).then(c=>c.put(req,clone))}return res})))})
