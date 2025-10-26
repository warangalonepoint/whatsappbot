<script>
/* Reads branding from DB.settings('branding') with LS fallback 'branding_json'
   and applies logo, banner, names. Safe to include on ANY page. */
(async function(){
  const els = {
    logo:  document.querySelector('[data-brand="logo"]'),
    banner:document.querySelector('[data-brand="banner"]'),
    title: document.querySelector('[data-brand="title"]'),
    subtitle:document.querySelector('[data-brand="subtitle"]'),
    pharmacyNav:document.querySelector('[data-brand="pharmacyNav"]')
  };
  function lsRead(){ try{return JSON.parse(localStorage.getItem('branding_json')||'null')||null;}catch{return null;} }
  let b=null;
  try{ await window.DB?.open?.(); const rec=await window.DB?.settings?.get?.('branding'); b=rec?.val||rec?.value||null; }catch{}
  if(!b) b=lsRead();
  b=b||{clinicName:'',clinicTag:'',pharmacyName:'',pharmacyTag:'',logoUrl:'',bannerUrl:''};

  const logo  = b.logoUrl   || './assets/logo.png';
  const banner= b.bannerUrl || './assets/banner.png';
  if(els.logo)   els.logo.src   = logo;
  if(els.banner) els.banner.src = banner;

  if(els.title)     els.title.textContent    = b.clinicName || els.title.textContent || 'Clinic';
  if(els.subtitle)  els.subtitle.textContent = b.clinicTag  || els.subtitle.textContent || '';
  if(els.pharmacyNav) els.pharmacyNav.textContent = b.pharmacyName || 'Pharmacy';
})();
</script>