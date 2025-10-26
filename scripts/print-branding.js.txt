/* print-branding.js
 * Applies saved branding (logo, names, address, theme) to print pages.
 * Works with DB.settings('branding') if DB exists, else localStorage.branding_json.
 */
(function () {
  async function fetchBrand() {
    let b = null;
    if (window.DB?.settings?.get) {
      try { await DB.open?.(); b = (await DB.settings.get('branding'))?.val || null; } catch {}
    }
    if (!b) { try { b = JSON.parse(localStorage.getItem('branding_json')||'null'); } catch {} }
    return b || {};
  }

  function txt(id, v){ const el = document.getElementById(id); if(el && v) el.textContent = v; }
  function src(sel, v){ if(!v) return; document.querySelectorAll(sel).forEach(el => { if(!el.dataset.locked) el.src = v; }); }

  function apply(b){
    const logo = b.logoUrl || '../assets/logo.png';
    // targets you may have in print pages:
    src('img[data-print="logo"], #printLogo, .print-logo', logo);
    txt('printClinic',   b.clinicName || '');
    txt('printPharmacy', b.pharmacyName || '');
    txt('printTag',      b.clinicTag || b.pharmacyTag || '');
    txt('printAddr',     b.address || '');

    // optional theme hook for print css variables
    document.documentElement.setAttribute('data-theme', b.theme || 'pastel');
    window.dispatchEvent(new CustomEvent('theme:apply', { detail:{theme:b.theme||'pastel'} }));
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    apply(await fetchBrand());
    // live update if settings page opened the print in another tab and broadcasts
    window.addEventListener('branding:change', e => apply(e.detail||{}));
  });
})();