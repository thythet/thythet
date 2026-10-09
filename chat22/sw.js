const CACHE='thechat-v2.2.5';
const CORE=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('thechat-v')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy)).catch(()=>{});return res}).catch(()=>caches.match('./index.html')));return;
  }
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{})}return res})));
});
// Firebase Cloud Messaging background handler. FCM sends data-only payloads from
// our trusted Cloud Function to prevent duplicate system notifications.
try{
  importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js');
  firebase.initializeApp({
    apiKey:'AIzaSyBof66mcb0L-GHFvn1wNVAhSFeHaIzep4M',
    authDomain:'thechat-a79b9.firebaseapp.com',
    databaseURL:'https://thechat-a79b9-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId:'thechat-a79b9',
    storageBucket:'thechat-a79b9.firebasestorage.app',
    messagingSenderId:'352306422331',
    appId:'1:352306422331:web:9b15b0283104f48d99321e'
  });
  firebase.messaging().onBackgroundMessage(payload=>{
    const data=payload.data||{};
    const title=String(data.senderName||'thechat').slice(0,100);
    const body=String(data.preview||'New message').slice(0,80);
    const icon=/^https:\/\//.test(data.avatarUrl||'')?data.avatarUrl:'./icons/icon-192.png';
    return clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      if(list.some(c=>c.focused&&c.visibilityState==='visible'))return;
      return self.registration.showNotification(title,{
        body,icon,badge:'./icons/icon-192.png',
        tag:'chat-'+String(data.chatId||'new'),renotify:true,
        data:{url:data.url||'./index.html'}
      });
    });
  });
}catch(error){console.warn('Firebase messaging could not initialize in service worker',error)}
self.addEventListener('notificationclick',event=>{
  event.notification.close();const target=new URL(event.notification.data?.url||'./index.html',self.location.href).href;
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const client of list){if('focus'in client){client.navigate?.(target);return client.focus()}}return clients.openWindow?clients.openWindow(target):undefined}));
});
