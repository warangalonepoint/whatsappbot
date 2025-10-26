// /scripts/app-wiring.js
// Single-source DB wiring for Clinic PWA (patients, pharmacy, suppliers, settings)
// - Safe to include on every page
// - Reuses window.DB if already defined
// - Provides diagnostics toggle, simple KV helpers, health check, and a tiny event bus

;(function (global) {
  // --- short logging helper (enabled via DB.enableDiagnostics(true))
  const dlog = (...a) => (global._diagEnabled ? console.debug('[app]', ...a) : void 0);

  // --- Reuse existing Dexie instance if available
  let DB = global.DB;
  if (!DB) {
    if (!global.Dexie) {
      console.error('Dexie is not loaded. Include Dexie before app-wiring.js');
      return;
    }
    DB = new Dexie('clinicdb');

    // ========= Schema & upgrade path =========
    // v1: core clinic
    DB.version(1).stores({
      patients: '++id, name, phone',
      bookings: '++id, date, pid',
      meta: 'key'
    });

    // v2: pharmacy core
    DB.version(2).stores({
      products: '&sku, name, form, brandName, companyName',        // & = unique
      batches: '++id, sku, batchNo, expiry, rate, mrp, stockQty',
      sales: '++id, date, source, items, subtotal, total, billNo, mode'
    });

    // v3: purchases (+ gst breakdown)
    DB.version(3).stores({
      purchases:
        '++id, date, supplier, supplierId, invNo, items, subtotal, taxCgst, taxSgst, taxIgst, total'
    });

    // v4: supplier accounts (payments + openings)
    DB.version(4).stores({
      supplier_payments: '++id, date, supplier, supplierId, amount, mode, refNo, notes',
      supplier_opening_balances: '++id, supplier, openingAmount, asOfDate'
    });

    // v5: returns (sales / purchase)
    DB.version(5).stores({
      returns: '++id, date, source, supplier, supp, refId, items'
    });

    // v6: app settings (key → val)
    DB.version(6).stores({
      settings: 'key'
    });

    // v7: small index tune-ups without breaking keys (no store changes → keep same stores)
    DB.version(7).stores({
      // No primary-key changes; repeat stores to keep Dexie upgrade chain consistent
      patients: '++id, name, phone',
      bookings: '++id, date, pid',
      meta: 'key',
      products: '&sku, name, form, brandName, companyName',
      batches: '++id, sku, batchNo, expiry, rate, mrp, stockQty',
      sales: '++id, date, source, items, subtotal, total, billNo, mode',
      purchases:
        '++id, date, supplier, supplierId, invNo, items, subtotal, taxCgst, taxSgst, taxIgst, total',
      supplier_payments: '++id, date, supplier, supplierId, amount, mode, refNo, notes',
      supplier_opening_balances: '++id, supplier, openingAmount, asOfDate',
      returns: '++id, date, source, supplier, supp, refId, items',
      settings: 'key'
    });

    // Optional: migration touch-ups (no destructive transforms)
    DB.version(7).upgrade(async (tx) => {
      // Ensure settings object store has some known keys structure if needed
      try {
        const s = await tx.table('settings').get('branding');
        if (s && s.val && s.val.logoUrl && !s.val.theme) {
          s.val.theme = 'pastel';
          await tx.table('settings').put(s);
        }
      } catch (_) {}
    });
  }

  // --- Diagnostics toggle
  DB.enableDiagnostics = (on) => {
    global._diagEnabled = !!on;
    dlog('Diagnostics', on ? 'ON' : 'OFF');
  };

  // --- Tiny event bus for cross-file “branding applied” etc.
  const _bus = document.createElement('div');
  DB.bus = {
    on: (ev, fn) => _bus.addEventListener(ev, fn),
    off: (ev, fn) => _bus.removeEventListener(ev, fn),
    emit: (ev, detail) => _bus.dispatchEvent(new CustomEvent(ev, { detail }))
  };

  // --- Simple KV helpers backed by settings (key → {key, val})
  DB.kv = {
    async get(key) {
      try {
        await DB.open();
        const rec = await DB.settings.get(key);
        return rec?.val ?? rec?.value ?? null;
      } catch (e) {
        dlog('kv.get failed', key, e);
        return null;
      }
    },
    async set(key, val) {
      try {
        await DB.open();
        await DB.settings.put({ key, val });
        return true;
      } catch (e) {
        console.warn('kv.set failed', key, e);
        return false;
      }
    },
    async del(key) {
      try {
        await DB.open();
        await DB.settings.delete(key);
      } catch (e) {
        console.warn('kv.del failed', key, e);
      }
    }
  };

  // --- Health check utility (quick sanity for pages)
  DB.healthCheck = async function () {
    try {
      await DB.open();
      const names = DB.tables.map((t) => t.name).sort();
      // touch a couple of tables (no throw means OK)
      await Promise.all([
        DB.table('patients').limit(1).toArray().catch(() => []),
        DB.table('products').limit(1).toArray().catch(() => []),
        DB.table('purchases').limit(1).toArray().catch(() => [])
      ]);
      return { ok: true, dbName: DB.name, tables: names };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  };

  // --- Small helper to seed a few records (used by diagnostics/seed buttons)
  DB.seedIfEmpty = async function () {
    await DB.open();
    const hasProd = (await DB.products.count()) > 0;
    if (hasProd) return;
    dlog('Seeding demo inventory…');
    await DB.products.bulkPut([
      { sku: 'PCM500', name: 'Paracetamol 500mg', form: 'Tablet', brandName: 'Generic' },
      { sku: 'AZI500', name: 'Azithromycin 500mg', form: 'Tablet', brandName: 'Zed' }
    ]);
    await DB.batches.bulkAdd([
      { sku: 'PCM500', batchNo: 'P24A', expiry: '2026-02', rate: 12.5, mrp: 20, stockQty: 50 },
      { sku: 'AZI500', batchNo: 'A24Z', expiry: '2026-05', rate: 85, mrp: 120, stockQty: 30 }
    ]);
  };

  // --- Make globally accessible and open DB (non-blocking)
  global.DB = DB;
  DB.open()
    .then(() => dlog('DB ready; tables:', DB.tables.map((t) => t.name)))
    .catch((e) => console.warn('DB open failed', e));
})(window);