/* brand-sync.js
 * Auto-sync branding across all pages (logo, banner, clinic/pharmacy names)
 * Works with settings saved in Dexie DB.settings('branding') or localStorage.branding_json
 */

(function () {
  // Helper to apply brand object to UI components
  function applyBrand(b) {
    if (!b) return;

    const logo = b.logoUrl || './assets/logo.png';
    const banner = b.bannerUrl || './assets/banner.png';

    // Common placements (Headers, Banners, Buttons)
    const targets = [
      { sel: '#hdrLogo, img[data-brand="logo"], .header .logo', val: logo },
      { sel: '#hdrBanner, img[data-brand="banner"], .banner img', val: banner },
    ];

    targets.forEach(t => {
      document.querySelectorAll(t.sel).forEach(el => {
        if (!el.dataset.locked) el.src = t.val;
      });
    });

    // Update Pharmacy/Clinic names in buttons/navigation if present
    const phName = b.pharmacyName || 'Pharmacy';
    const clName = b.clinicName || '';
    const clTag = b.clinicTag || '';

    document.querySelectorAll('#phNavName, .pharmacy-name').forEach(el => {
      el.textContent = phName;
    });

    // Update page title automatically
    if (clName && !document.title.includes(clName)) {
      if (/pharmacy/i.test(document.title) && phName) {
        document.title = `${phName} · ${document.title.replace(/.*·\s*/, '')}`;
      } else {
        document.title = `${document.title.replace(/ ·.*/, '')} · ${clName}`;
      }
    }

    // Apply theme attribute (CSS will respond)
    document.documentElement.setAttribute('data-theme', b.theme || 'pastel');
  }

  // Try to read branding from Dexie/LocalStorage
  async function fetchBranding() {
    let b = null;
    if (window.DB?.settings?.get) {
      try {
        await DB.open?.();
        const rec = await DB.settings.get('branding');
        b = rec?.val || null;
      } catch {}
    }
    if (!b) {
      try {
        b = JSON.parse(localStorage.getItem('branding_json') || 'null') || null;
      } catch {}
    }
    return b;
  }

  // Listen for live branding change events
  window.addEventListener('branding:change', e => {
    applyBrand(e.detail);
  });

  // Initial boot on load
  document.addEventListener('DOMContentLoaded', async () => {
    const b = await fetchBranding();
    applyBrand(b);
  });

  // Expose externally if any other modules want to trigger manual refresh
  window.BrandSync = { apply: applyBrand, fetch: fetchBranding };
})();