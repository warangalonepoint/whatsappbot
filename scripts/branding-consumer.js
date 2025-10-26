<!-- /scripts/branding-consumer.js -->
<script>
(function(){
  const THEMES = {
    pastel:{'--bg-gradient':'linear-gradient(145deg,#edf3f0,#ece9f6,#fff0e6)','--mint':'#C8E3D2','--lav':'#D7CEF0','--peach':'#FFD8B8','--card':'#ffffff','--ink':'#0f172a','--muted':'#475569','--primary':'#17B26A'},
    glass:{'--bg-gradient':'linear-gradient(135deg,#eef2ff,#ecfeff,#fef9c3)','--mint':'#E0F2FE','--lav':'#E9D5FF','--peach':'#FFE4E6','--card':'#ffffff','--ink':'#0f172a','--muted':'#475569','--primary':'#0EA5E9'},
    neo:{'--bg-gradient':'linear-gradient(145deg,#f1f5f9,#e2e8f0,#f8fafc)','--mint':'#E2F7EC','--lav':'#EDE9FE','--peach':'#FFEAD5','--card':'#ffffff','--ink':'#0f172a','--muted':'#475569','--primary':'#111827'},
    iphone:{'--bg-gradient':'linear-gradient(180deg,#f7f7f7,#f0f0f0)','--mint':'#E6F4EA','--lav':'#EEE7FF','--peach':'#FFE7D6','--card':'#ffffff','--ink':'#111111','--muted':'#4b5563','--primary':'#0A84FF'}
  };

  async function readBranding(){
    // prefer Dexie settings.branding (through your /scripts/db.js), else LS
    let b=null;
    try{ await window.DB?.open?.(); b = await window.DB?.settings?.get?.('branding'); b = b?.val||b?.value||null; }catch{}
    if(!b){ try{ b = JSON.parse(localStorage.getItem('branding_json')||'null'); }catch{} }
    return b || {
      clinicName:'', clinicTag:'', address:'',
      pharmacyName:'', pharmacyTag:'', theme:'pastel',
      logoUrl:'', bannerUrl:'', bannerFit:'contain', bannerH:160
    };
  }

  function applyThemeVars(theme){
    const m = THEMES[theme] || THEMES.pastel;
    const root=document.documentElement;
    Object.entries(m).forEach(([k,v])=> root.style.setProperty(k,v));
  }

  function applyBrandingToDOM(b){
    applyThemeVars(b.theme||'pastel');
    // images (if present on page)
    const logoEl   = document.querySelector('#hdrLogo, .logo');
    const bannerEl = document.querySelector('#hdrBanner, .banner img');
    if(logoEl)   logoEl.src   = b.logoUrl   || '/assets/logo.png';
    if(bannerEl) bannerEl.src = b.bannerUrl || '/assets/banner.png';

    // banner sizing (CSS variables read by pages)
    const root=document.documentElement;
    root.style.setProperty('--banner-h',  (b.bannerH||160) + 'px');
    root.style.setProperty('--banner-fit', b.bannerFit||'contain');
  }

  async function loadAndApplyBranding(){ const b=await readBranding(); applyBrandingToDOM(b); }

  // Expose a safe global helper
  window.Branding = { loadAndApplyBranding };

  // React to changes saved from Settings (brand touch)
  window.addEventListener('storage', (e)=>{
    if(e.key==='branding_touch' || e.key==='branding_json'){ loadAndApplyBranding(); }
  });

  // Auto-apply on page load
  document.addEventListener('DOMContentLoaded', loadAndApplyBranding);
})();
</script>