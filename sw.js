/* service-worker.js — v2 (Push+Local notify) */
self.addEventListener('install', (e)=> self.skipWaiting());
self.addEventListener('activate', (e)=> self.clients.claim());

/* Minimal passthrough fetch (kept safe) */
self.addEventListener('fetch', ()=>{ /* no-op */ });

/* -------- Local notifications (from any client via postMessage) -------- */
self.addEventListener('message', (event)=>{
  const data = event.data || {};
  if (data && data.type === 'local-notify') {
    const { title, options } = (data.payload || {});
    try{ self.registration.showNotification(title || 'Notification', options || {}); }catch(_){}
  }
});

/* -------- Real Web Push (if you wire a server later) -------- */
self.addEventListener('push', (event)=>{
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch(_){}
  const title   = payload.title || 'Clinic Update';
  const options = payload.options || {
    body: payload.body || '',
    icon: payload.icon || '/assets/logo-192.png',
    badge: payload.badge || '/assets/logo-192.png',
    tag:   payload.tag   || 'clinic-push',
    data:  payload.data  || {}
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event)=>{
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/opd-live.html';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type:'window', includeUncontrolled:true });
    const hit = all.find(c => c.url.includes(target));
    if (hit) { hit.focus(); }
    else { self.clients.openWindow(target); }
  })());
});
