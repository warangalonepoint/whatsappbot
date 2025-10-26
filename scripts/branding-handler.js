<!-- Place this file at /scripts/branding-handler.js -->
<script>
// OneStop Solo Clinic — Branding/Theming Handler v1.0
(function (global) {
  const THEMES = {
    pastel: {
      name: 'Pastel',
      vars: {
        '--bg-gradient': 'linear-gradient(145deg,#edf3f0,#ece9f6,#fff0e6)',
        '--glass': 'rgba(255,255,255,0.6)',
        '--card': '#ffffff',
        '--ink': '#0f172a',
        '--muted': '#475569',
        '--primary': '#17B26A',
        '--mint': '#C8E3D2',
        '--lav': '#D7CEF0',
        '--peach': '#FFD8B8',
        '--r': '16px',
        '--shadow': '0 6px 18px rgba(0,0,0,0.06)'
      }
    },
    glass: {
      name: 'Glass',
      vars: {
        '--bg-gradient': 'linear-gradient(135deg,#eaf1ff,#f7fbff,#fffaf3)',
        '--glass': 'rgba(255,255,255,0.45)',
        '--card': '#ffffff',
        '--ink': '#0b1220',
        '--muted': '#475569',
        '--primary': '#0ea5e9',
        '--mint': '#E7F4FF',
        '--lav': '#EDEBFF',
        '--peach': '#FFEAD5',
        '--r': '16px',
        '--shadow': '0 10px 30px rgba(15,23,42,.10)'
      }
    },
    neo: {
      name: 'Neo',
      vars: {
        '--bg-gradient': 'linear-gradient(145deg,#f1f5f9,#ffffff)',
        '--glass': 'rgba(255,255,255,0.8)',
        '--card': '#ffffff',
        '--ink': '#0b1220',
        '--muted': '#475569',
        '--primary': '#111827',
        '--mint': '#F1F5F9',
        '--lav': '#EEF2FF',
        '--peach': '#FFE4E6',
        '--r': '16px',
        '--shadow': '0 10px 26px rgba(15,23,42,.08)'
      }
    },
    iphone: {
      name: 'iPhone',
      vars: {
        '--bg-gradient': 'linear-gradient(145deg,#f4f6f8,#fafafa)',
        '--glass': 'rgba(255,255,255,0.9)',
        '--card': '#ffffff',
        '--ink': '#111827',
        '--muted': '#6b7280',
        '--primary': '#0ea5e9',
        '--mint': '#F1F5F9',
        '--lav': '#F5F3FF',
        '--peach': '#FFF7ED',
        '--r': '18px',
        '--shadow': '0 12px 32px rgba(0,0,0,.08)'
      }
    }
  };

  const STORAGE_KEY = 'branding_json';

  async function openDexie() {
    if (!global.Dexie) return null;
    // Reuse existing db if created by app
    try {
      const db = new Dexie('clinicdb');
      // tables may already exist; just open if present
      await db.open();
      return db;
    } catch { return null; }
  }

  async function readBrandingFromDB() {
    try {
      const db = await openDexie();
      if (!db) return null;
      if (!db.tables.some(t => t.name === 'settings')) return null;
      const rec = await db.table('settings').get('branding');
      return (rec && (rec.val || rec.value)) || null;
    } catch { return null; }
  }
  function readBrandingFromLS() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  function writeBrandingToLS(b) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(b)); } catch {}
  }

  function applyThemeVars(themeName) {
    const theme = THEMES[themeName] ? THEMES[themeName] : THEMES.pastel;
    const root = document.documentElement;
    Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  }

  function applyBannerHeight(px) {
    const root = document.documentElement;
    const safe = Math.max(80, Math.min(320, Number(px) || 160));
    root.style.setProperty('--banner-height', safe + 'px');
  }

  function updateImages(logoUrl, bannerUrl) {
    document.querySelectorAll('[data-brand="logo"], .brand-logo').forEach(img => {
      if (logoUrl) img.src = logoUrl;
    });
    document.querySelectorAll('[data-brand="banner"], .brand-banner').forEach(img => {
      if (bannerUrl) img.src = bannerUrl;
    });
  }

  function updateTexts(b) {
    // Common ids used across pages (safe: only updates if present)
    if (b?.clinicName) {
      const el = document.getElementById('clinicTitle');
      if (el) el.textContent = b.clinicName;
    }
    if (b?.clinicTag) {
      const el = document.getElementById('clinicSubtitle');
      if (el) el.textContent = b.clinicTag;
    }
    if (b?.pharmacyName) {
      const el = document.getElementById('phNavName');
      if (el) el.textContent = b.pharmacyName;
    }
  }

  async function loadBranding() {
    const dbVal = await readBrandingFromDB();
    const lsVal = readBrandingFromLS();

    // Merge: DB overrides LS if present; else use LS; else defaults
    const b = Object.assign({
      clinicName: '',
      clinicTag: '',
      address: '',
      pharmacyName: '',
      pharmacyTag: '',
      theme: 'pastel',
      bannerHeight: 160,
      logoUrl: '',
      bannerUrl: ''
    }, lsVal || {}, dbVal || {});
    // Persist merged to LS for quick access
    writeBrandingToLS(b);
    return b;
  }

  async function applyBranding() {
    const b = await loadBranding();

    // Theme
    applyThemeVars(b.theme || 'pastel');
    applyBannerHeight(b.bannerHeight || 160);

    // Images & texts
    updateImages(b.logoUrl || './assets/logo.png', b.bannerUrl || './assets/banner.png');
    updateTexts(b);

    // Add a data-theme attr to body for css hooks if needed
    document.body?.setAttribute('data-theme', b.theme || 'pastel');

    // Notify listeners
    _listeners.forEach(fn => { try { fn(b); } catch {} });
    return b;
  }

  const _listeners = [];
  function onChange(fn) {
    if (typeof fn === 'function') _listeners.push(fn);
  }

  // Expose
  global.Branding = {
    apply: applyBranding,
    onChange,
    themes: Object.keys(THEMES),
    readCached: () => readBrandingFromLS(),
  };

  // Auto-apply soon after load (wait a tick so pages can add DOM)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBranding);
  } else {
    setTimeout(applyBranding, 0);
  }
})(window);
</script>