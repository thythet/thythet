/* Love Kid Pro PWA app shell. Never cache Firebase responses or student data. */
const CACHE="sundaykidpro-shell-v28";
const SHELL=[
  "./","./index.html","./dashboard.html",
  "./themes.css","./effects.css","./theme-switcher.js","./effect-switcher.js",
  "./pwa-install.js","./app-info-launcher.js","./app-info.html",
  "./manifest.webmanifest","./client-config.js","./icons/icon-192.png","./icons/icon-512.png",
  "./assets/img/siteicon.png","./vendor/remixicon/remixicon.css",
  "./vendor/remixicon/remixicon.woff2","./fonts/Krasar-Regular.woff"
];
const STATIC=new Set(SHELL.map(path=>new URL(path,self.registration.scope).pathname));
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))
    .then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.filter(key=>key.startsWith("sundaykidpro-shell-")&&key!==CACHE).map(key=>caches.delete(key))
  )).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
  if(request.mode==="navigate"){
    event.respondWith(fetch(request).catch(async()=>
      (await caches.match(request,{ignoreSearch:true}))||
      (await caches.match("./index.html"))));
    return;
  }
  // Only public, explicitly listed app-shell files are cached. The Firebase
  // database, Cloudinary images, photo uploads and other live data remain online.
  if(!STATIC.has(url.pathname))return;
  event.respondWith(caches.match(request,{ignoreSearch:true}).then(hit=>
    hit||fetch(request)));
});
