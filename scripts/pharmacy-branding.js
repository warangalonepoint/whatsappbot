/* scripts/pharmacy-branding.js
   Applies saved branding (theme, logo, banner, banner height) across the app.
   Sources: DB.settings('branding') → localStorage('branding_json') → defaults.
   Exposes: window.PharmacyBranding.onChange(cb) to react to updates.
*/

(function () {
  const q = (s) => document.querySelector(s);

  // ---- THEMES (extendable) ----
  const THEMES = {
    pastel: {
      '--bg-gradient': 'linear-gradient(145deg,#eef3f1,#f0eef9,#fff2eb)',
      '--mint': '#D6E5DD',
      '--lav': '#DED8F2',
      '--peach': '#FFE8D9',
      '--card': '#ffffff',
      '--ink': '#0f172a',
      '--muted': '#475569',
      '--primary': '#139a5b',
      '--header-tint': '#D6E5DD',
      '--banner-tint': '#DED8F2'
    },
    glass: {
      '--bg-gradient': 'linear-gradient(145deg,#ecf3ff,#f6f8fb,#ffffff)',
      '--mint': '#E3F2FD',
      '--lav': '#EDE7F6',
      '--peach': '#FFF3E0',
      '--card': 'rgba(255,255,255,0.85)',
      '--ink': '#0f172a',
      '--muted': '#475569',
      '--primary': '#2563eb',
      '--header-tint': '#E3F2FD',
      '--banner-tint': '#EDE7F6'
    },
    neo: {
      '--bg-gradient': 'linear-gradient(145deg,#e9eef3,#f8fafc,#ffffff)',
      '--mint': '#E2F7EC',
      '--lav': '#E9E7FF',
      '--peach': '#FFE9D5',
      '--card': '#ffffff',
      '--ink': '#0b1324',
      '--muted': '#44536a',
      '--primary': '#111827',
      '--header-tint': '#E9E7FF',
      '--banner-tint': '#E2F7EC'
    },
    iphone: {
      '--bg-gradient': 'linear-gradient(145deg,#f5f7fa,#ffffff,#f0f2f5)',
      '--mint': '#e8f5e9',
      '--lav': '#ede7f6',
      '--peach': '#fff3e0',
      '--card': '#ffffff',
      '--ink': '#111111',
      '--muted': '#6b7280',
      '--primary': '#0ea5e9',
      '--header-tint': '#ede7f6',
      '--banner-tint': '#e8f5e9'
    }
  };

  const DEFAULTS = {
    clinicName: '',
    clinicTag: '',
    pharmacyName: '',
    pharmacyTag: '',
    address: '',
    theme: 'pastel',
    bannerHeight: '160px',
    logoUrl: '',
    bannerUrl: ''
  };

  const listeners = [];
  const PharmacyBranding = {
    onChange(cb) { if (typeof cb === 'function') listeners.push(cb); },
    // programmatic trigger (optional)
    _emit(payload) { listeners.forEach(fn => { try { fn(payload); } catch {} }); }
  };
  window.PharmacyBranding = PharmacyBranding;

  function lsGet() {
    try { return JSON.parse(localStorage.getItem('branding_json') || 'null'); }
    catch { return null; }
  }

  async function dbGet() {
    try {
      if (!window.DB || !DB.open || !DB.settings) return null;
      await DB.open();
      const rec = await DB.settings.get('branding');
      return rec?.val || rec?.value || null;
    } catch { return null; }
  }

  function applyThemeVars(themeKey, bannerHeight) {
    const vars = THEMES[themeKey] || THEMES.pastel;
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    root.style.setProperty('--banner-h', bannerHeight || DEFAULTS.bannerHeight);
  }

  function applyImages(branding) {
    const logo = branding.logoUrl || './assets/logo.png';
    const banner = branding.bannerUrl || './assets/banner.png';
    // common ids that pages may use (any that exist will be updated)
    ['#logo', '#hdrLogo'].forEach(id => { const el = q(id); if (el && el.tagName === 'IMG') el.src = logo; });
    ['#bannerImg', '#hdrBanner'].forEach(id => { const el = q(id); if (el && el.tagName === 'IMG') el.src = banner; });
  }

  function applyBranding(branding) {
    const b = { ...DEFAULTS, ...(branding || {}) };
    applyThemeVars(b.theme, b.bannerHeight);
    applyImages(b);
    PharmacyBranding._emit(b);
  }

  async function init() {
    // prefer DB, fallback LS
    const fromDB = await dbGet();
    const branding = fromDB || lsGet() || DEFAULTS;
    applyBranding(branding);
  }

  // React to LS changes (e.g., saving from settings in another tab)
  window.addEventListener('storage', (e) => {
    if (e.key === 'branding_json') {
      try { applyBranding(JSON.parse(e.newValue || 'null') || DEFAULTS); } catch {}
    }
  });

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();