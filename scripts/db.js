/* db.js — onesystem_clinic · v11 (adds queue bridges)
   - Single source of truth for Dexie schema and light utilities
   - Safe to include on all pages (Admin, Bookings, OPD, Pharmacy, Lab, etc.)
*/
(function(){
  // ---------- Utilities ----------
  const todayISO = ()=> {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
  };
  const isoNow = ()=> new Date().toISOString();
  const lsGet = (k, fallback)=>{ try{ const v = JSON.parse(localStorage.getItem(k)||'null'); return (v==null?fallback:v); }catch{ return fallback; } };
  const lsSet = (k, v)=>{ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} };
  const lsTouch = (k)=>{ try{ localStorage.setItem(k, String(Date.now())); }catch{} };

  // ---------- Dexie DB ----------
  const DB = new Dexie('onesystem_clinic');

  /* v11 schema — additive only */
  DB.version(11).stores({
    // Core / Auth / Admin
    users: '++id, username, role, pinHash, active',
    settings: 'key',
    devices: 'deviceId, label, user, lastSeen, approved',
    audits: '++id, ts, user, deviceId, action, meta, hashPrev, hashSelf',
    settlements: '++id, type, from, to, createdAt, lockedBy, payload',

    // Patients / Bookings
    patients: '++id, pid, phone, name, dob, gender, createdAt, updatedAt, [name+phone]',
    bookings: '++id, date, ts, channel, tokenNo, status, phone, name, pid, visitType, [date+tokenNo], phone, pid',
    encounters: '++id, pid, date, type, tokenRef, createdAt, updatedAt',

    opd_fees: '++id, date, tokenRef, pid, name, phone, amount, mode',

    // Pharmacy / Lab Master
    products: '++id, sku, name, companyName, brandName, form, strength, hsn, gstPct, minStock',
    batches: '++id, sku, batchNo, mfgDate, expiry, mrp, rate, stockQty, supplierId',

    // Transactions
    purchases: '++id, invNo, date, supplierId, terms, items, subtotal, taxCgst, taxSgst, taxIgst, total',
    supplier_payments: '++id, supplierId, date, mode, refNo, amount, notes',
    supplier_opening_balances: '++id, supplierId, openingAmount, asOfDate',
    returns: '++id, date, source, refId, items, subtotal, tax, total',
    sales: '++id, billNo, date, patientPhone, patientName, pid, doctorName, items, subtotal, taxCgst, taxSgst, taxIgst, total, mode, source',

    // Lab
    lab_orders: '++id, pid, phone, name, source, tokenRef, status, createdAt, updatedAt, items',
    lab_results: '++id, orderId, reportDate, verifiedBy, verifiedAt',
    lab_pos_sales: '++id, billNo, date, source, pid, patientName, patientPhone, items, subtotal, tax, total, mode',

    // Purchasing Ops / Labels
    po_headers: '++id, supplierId, createdAt, status, promisedDate, notes, items',
    labels_print_log: '++id, ts, sku, batchNo, qty, payload'
  });

  // Default product hooks (safe defaults)
  DB.products.hook('creating', function (_pk, obj){
    obj.leadTimeDays   = obj.leadTimeDays   ?? 5;
    obj.targetCoverDays= obj.targetCoverDays?? 14;
    obj.safetyStockDays= obj.safetyStockDays?? 2;
    obj.packSize       = obj.packSize       ?? 1;
  });

  // ---------- Diagnostics ----------
  DB._diag = false;
  DB.enableDiagnostics = function(flag){
    DB._diag = !!flag;
    console.info('[DB] Diagnostics', DB._diag? 'ON':'OFF');
  };
  DB._log = (...args)=>{ if(DB._diag) console.log('[DB]', ...args); };

  // ---------- Open helper ----------
  DB.ensureOpen = async function(){
    if(!DB.isOpen()){
      await DB.open();
      DB._log('opened');
    }
    return DB;
  };

  // ---------- Cross-tab bus ----------
  const BUS_CH = 'clinic-queue-sync-v1';
  let _bc = null;
  try{ _bc = new BroadcastChannel(BUS_CH); }catch{}
  DB.bus = {
    ping(type, payload){
      try{ _bc?.postMessage({type, ts: Date.now(), payload}); }catch{}
      lsTouch(type+'_touch');
      DB._log('bus ping', type, payload||'');
    }
  };

  // ---------- Token helper ----------
  DB.tokens = {
    next(dateISO = todayISO()){
      const k = 'tok_'+dateISO;
      const n = (+(localStorage.getItem(k)||0)) + 1;
      localStorage.setItem(k, String(n));
      return n;
    }
  };

  // ---------- Branding ----------
  DB.branding = {
    KEY: 'branding',
    LS_KEY: 'branding_json',
    async get(){
      await DB.ensureOpen();
      try{
        const row = await DB.settings.get(DB.branding.KEY);
        return row?.val || row?.value || DB.branding._readLS() || null;
      }catch{
        return DB.branding._readLS() || null;
      }
    },
    async set(payload){
      await DB.ensureOpen();
      try{ await DB.settings.put({key: DB.branding.KEY, val: payload}); }catch{}
      try{ localStorage.setItem(DB.branding.LS_KEY, JSON.stringify(payload)); }catch{}
      DB.branding._emit(payload);
      DB.bus.ping('branding');
    },
    onChange(cb){
      if(typeof cb!=='function') return ()=>{};
      try{
        const bc = new BroadcastChannel('branding-bus-v1');
        bc.onmessage = (ev)=>{ if(ev?.data?.type==='branding-change'){ cb(ev.data.payload||null); } };
      }catch{}
      window.addEventListener('storage', (e)=>{
        if(e.key===DB.branding.LS_KEY){
          try{ cb(JSON.parse(e.newValue||'null')); }catch{ cb(null); }
        }
      });
      return ()=>{};
    },
    applyToDocument(payload){
      if(!payload) return;
      const root = document.documentElement;
      if(payload.themeVars && typeof payload.themeVars==='object'){
        Object.entries(payload.themeVars).forEach(([k,v])=> root.style.setProperty(k, v));
      }
      try{
        const logoEls = document.querySelectorAll('#logo, #hdrLogo, img[data-brand="logo"]');
        logoEls.forEach(el=> { if(payload.logoUrl) el.src = payload.logoUrl; });
        const banEls = document.querySelectorAll('#hdrBanner, img[data-brand="banner"]');
        banEls.forEach(el=> { if(payload.bannerUrl) el.src = payload.bannerUrl; });
      }catch{}
    },
    _emit(payload){
      try{
        const bc = new BroadcastChannel('branding-bus-v1');
        bc.postMessage({type:'branding-change', payload});
      }catch{}
    },
    _readLS(){
      try{ return JSON.parse(localStorage.getItem(DB.branding.LS_KEY)||'null'); }catch{ return null; }
    }
  };

  // ---------- Inventory helpers ----------
  DB.inv = {
    computeLanding(line){
      const paid = Number(line.paidQty||0);
      const free = Number(line.freeQty||0);
      const totalQty = paid + free;
      const cost = Number(line.lineAmount||0); // after discount, pre-tax
      return totalQty>0 ? (cost/totalQty) : 0;
    },
    async buildReorder(){
      await DB.ensureOpen();
      const products = await DB.products.toArray();
      const batches  = await DB.batches.toArray();
      const stockBySku = {};
      batches.forEach(b=>{
        stockBySku[b.sku] = (stockBySku[b.sku]||0) + Number(b.stockQty||0);
      });
      const suggestions = [];
      for(const p of products){
        const min = Number(p.minStock||0);
        const onHand = stockBySku[p.sku]||0;
        if(min>0 && onHand < min){
          suggestions.push({
            sku: p.sku, name: p.name, companyName: p.companyName||'',
            needed: (min - onHand)
          });
        }
      }
      const rec = {createdAt: todayISO(), supplierId: null, items: suggestions};
      rec.id = await DB.purchases_suggestions.add(rec);
      return rec;
    }
  };

  // ---------- NEW: Queue bridges ----------
  /** Enqueue an OPD prescription for Pharmacy. */
  DB.enqueuePharmacyRx = async function({ pid, patientName, patientPhone, items }){
    try{ await DB.ensureOpen(); }catch{}
    const dateStr = isoNow();
    const row = {
      date: dateStr,
      source: 'opd',
      mode: 'pending',
      pid: pid || '',
      patientName: patientName || '',
      patientPhone: patientPhone || '',
      items: Array.isArray(items)? items: [],
      subtotal: 0, taxCgst: 0, taxSgst: 0, taxIgst: 0, total: 0
    };
    try{
      const id = await DB.sales.add(row);
      DB._log('enqueuePharmacyRx → sales.id', id);
      lsTouch('sales_touch');
      DB.bus.ping('pharmacy_rx_enqueued', {id, pid: row.pid});
      return {ok:true, id};
    }catch(e){
      DB._log('enqueuePharmacyRx failed', e);
      return {ok:false, error:String(e||'err')};
    }
  };

  /** Enqueue Lab Orders (localStorage queue mirrored to Dexie). */
  DB.enqueueLabOrder = async function({ pid, name, phone, tokenRef, items, source='opd' }){
    const QKEY = 'lab_orders_queue';
    const order = {
      pid: pid||'',
      name: name||'',
      phone: phone||'',
      source,
      tokenRef: tokenRef || '',
      status: 'queued',
      createdAt: isoNow(),
      updatedAt: isoNow(),
      items: Array.isArray(items)? items: []
    };
    const q = lsGet(QKEY, []);
    q.push(order);
    lsSet(QKEY, q);
    lsTouch(QKEY+'_touch');
    try{
      await DB.ensureOpen();
      const id = await DB.lab_orders.add(order);
      DB._log('enqueueLabOrder → lab_orders.id', id);
    }catch(e){
      DB._log('enqueueLabOrder (mirror) failed', e);
    }
    DB.bus.ping('lab_order_enqueued', {pid: order.pid});
    return {ok:true};
  };

  // ---------- Convenience exports ----------
  DB.todayISO = todayISO;

  // Expose globally
  window.DB = DB;

  // Eager open (safe if already open)
  DB.ensureOpen().catch(()=>{ /* swallow */ });
})();