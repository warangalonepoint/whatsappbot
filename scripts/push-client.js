// push-client.js (NEW) — register SW, subscribe/unsubscribe, simple API
(function(){
  const app = {};
  const toUint8Array = (base64) => {
    // atob-safe base64url → uint8
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const base64Safe = (base64 + padding).replace(/\-/g,'+').replace(/_/g,'/');
    const raw = atob(base64Safe);
    const output = new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++) output[i] = raw.charCodeAt(i);
    return output;
  };

  app.ensureSW = async function(){
    if(!('serviceWorker' in navigator)) return null;
    try{
      const reg = await navigator.serviceWorker.register('./sw.js');
      return reg;
    }catch{ return null; }
  };

  app.subscribe = async function(){
    const reg = await navigator.serviceWorker.ready;
    if(!reg?.pushManager) return null;
    const vapid = (window.APP_CONFIG && window.APP_CONFIG.VAPID_PUBLIC_KEY) ? window.APP_CONFIG.VAPID_PUBLIC_KEY : null;
    if(!vapid) return null;
    try{
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toUint8Array(vapid)
      });
      // persist locally (optional: also put in Dexie settings)
      localStorage.setItem('push_sub', JSON.stringify(sub));
      try{ await DB.open?.(); await DB.settings?.put?.({key:'push_sub', val:sub}); }catch{}
      localStorage.setItem('push_touch', String(Date.now()));
      return sub;
    }catch(e){
      console.warn('Push subscribe failed', e);
      return null;
    }
  };

  app.unsubscribe = async function(){
    try{
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if(sub) await sub.unsubscribe();
    }catch{}
    localStorage.removeItem('push_sub');
    try{ await DB.settings?.delete?.('push_sub'); }catch{}
    localStorage.setItem('push_touch', String(Date.now()));
    return true;
  };

  app.getSubscription = async function(){
    try{
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if(sub) return sub;
    }catch{}
    try{ return JSON.parse(localStorage.getItem('push_sub')||'null'); }catch{ return null; }
  };

  // Wire a checkbox toggle (optional use in Settings)
  app.initToggle = async function(checkboxEl){
    if(!checkboxEl) return;
    const hasPerm = (Notification?.permission === 'granted');
    const sub = await app.getSubscription();
    checkboxEl.checked = !!(hasPerm && sub);
    checkboxEl.addEventListener('change', async (e)=>{
      if(e.target.checked){
        if(Notification?.permission !== 'granted'){
          const p = await Notification.requestPermission();
          if(p!=='granted'){ e.target.checked=false; return; }
        }
        await app.ensureSW();
        const ok = await app.subscribe();
        e.target.checked = !!ok;
      }else{
        await app.unsubscribe();
      }
    });
  };

  window.PushClient = app;
})();
