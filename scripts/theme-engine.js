<script>
// Theme Engine v2 — single source of truth for branding & theme
// Works on any page. Safe if logo/banner elements are absent.

(function(){
  const ROOT = document.documentElement;
  const DEFAULTS = {
    theme: 'pastel',
    logoUrl: './assets/logo.png',
    bannerUrl: './assets/banner.png',
    bannerH: 160,
    bannerFit: 'contain',
    clinicName: '',
    clinicTag: '',
    pharmacyName: '',
    pharmacyTag: '',
  };

  const THEMES = {
    pastel: {'--bg-gradient':'linear-gradient(145deg,#edf3f0,#ece9f6,#fff0e6)','--card':'#ffffff','--ink':'#0f172a','--muted':'#475569','--primary':'#17B26A','--mint':'#C8E3D2','--lav':'#D7CEF0','--peach':'#FFD8B8'},
    glass:  {'--bg-gradient':'linear-gradient(135deg,#f8fafc,#eef2ff)','--card':'#ffffffcc','--ink':'#0f172a','--muted':'#475569','--primary':'#2563eb','--mint':'#e2e8f0','--lav':'#e9d5ff','--peach':'#ffedd5'},
    neo:    {'--bg-gradient':'linear-gradient(135deg,#f3f4f6,#fafafa)','--card':'#ffffff','--ink':'#111827','--muted':'#6b7280','--primary':'#10b981','--mint':'#d1fae5','--lav':'#ede9fe','--peach':'#ffe4e6'},
    iphone: {'--bg-gradient':'linear-gradient(180deg,#fdf2f8,#eff6ff)','--card':'#ffffff','--ink':'#0f172a','--muted':'#475569','--primary':'#0ea5e9','--mint':'#e0f2fe','--lav':'#e9d5ff','--peach':'#ffe4e6'}
  };

  function safeJSON(k){
    try{ return JSON.parse(localStorage.getItem(k)||'null')||null; }catch{ return null; }
  }
  async function readBrandingFromDexie(){
    try{
      const db = (window.DB && window.DB.open)? window.DB : null;
      if(!db || !db.settings?.get) return null;
      await db.open?.();
      const rec = await db.settings.get('branding');
      return (rec?.val || rec?.value || null);
    }catch{ return null; }
  }

  function applyThemeVars(theme){
    const map = THEMES[theme] || THEMES.pastel;
    Object.entries(map).forEach(([k,v])=> ROOT.style.setProperty(k, v));
  }
  function setBannerVars(h, fit){
    ROOT.style.setProperty('--banner-h',  `${Number(h||DEFAULTS.bannerH)}px`);
    ROOT.style.setProperty('--banner-fit', fit || DEFAULTS.bannerFit);
  }
  function swapImages(logo, banner){
    // Logos
    document.querySelectorAll('#hdrLogo, img.logo, img#logo, img[alt*="logo" i]').forEach(el=>{
      if(logo && el) el.src = logo;
    });
    // Banners
    document.querySelectorAll('#hdrBanner, .banner img, img[alt*="banner" i]').forEach(el=>{
      if(banner && el) el.src = banner;
    });
  }
  function writeTitles(b){
    // Optional: if pages have these ids, update them
    const cTitle = document.getElementById('clinicTitle');
    if(cTitle && b.clinicName) cTitle.textContent = b.clinicName;
    const phName = document.getElementById('ph_name');
    if(phName && b.pharmacyName) phName.textContent = b.pharmacyName;
  }

  async function applyBranding(){
    // Dexie → LS → defaults
    let b = await readBrandingFromDexie();
    if(!b) b = safeJSON('branding_json');
    b = Object.assign({}, DEFAULTS, b||{});

    applyThemeVars(b.theme);
    setBannerVars(b.bannerH, b.bannerFit);
    swapImages(b.logoUrl || DEFAULTS.logoUrl, b.bannerUrl || DEFAULTS.bannerUrl);
    writeTitles(b);
  }

  // Boot + live updates
  document.addEventListener('DOMContentLoaded', applyBranding);
  window.addEventListener('storage', e=>{
    if(e.key==='branding_touch') applyBranding();
  });

  // Expose for rare manual calls
  window.__ThemeEngine = { applyBranding };
})();
</script>
