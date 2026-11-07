const CACHE_NAME = 'ideaarena-static-v1';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const r=e.request, u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/api/')) return;
  if(r.mode==='navigate'){ e.respondWith(fetch(r).then(res=>{const copy=res.clone(); caches.open(CACHE_NAME).then(c=>c.put('/',copy)); return res;}).catch(()=>caches.match('/'))); return; }
  e.respondWith(caches.match(r).then(cached=>cached||fetch(r)));
});
