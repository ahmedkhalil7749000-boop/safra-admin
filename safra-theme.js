/* Safra visual theme bridge. No Firebase/data/business logic changes. */
window.SAFRA_THEME={colors:{dark:'#063B2C',green:'#16B77E',gold:'#EFBD61',cream:'#FAF8F3',text:'#17201C'},motion:{fast:220,mid:420,parallax:600}};
(function(){
  const applyVideoRatio=()=>document.querySelectorAll('.ad-video-thumb-wrap').forEach(el=>{
    const raw=(el.dataset.orientation||el.getAttribute('data-orientation')||'').toLowerCase();
    const wide=['landscape','wide','horizontal','16:9','16/9'].includes(raw);
    if(wide) el.style.setProperty('--sf-video-ratio','16/9');
  });
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',applyVideoRatio); else applyVideoRatio();
})();
