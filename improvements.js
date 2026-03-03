// ============================================================
// improvements.js — Performance + UX + Mobile
// Añadir como último <script> antes de </body> en index.html
// NO modifica ningún fichero existente. Todo es aditivo.
// ============================================================

/* ============================================================
   1. CACHÉ EN MEMORIA — Reduce lecturas Firestore
   ============================================================ */
window._cache = {
  students:{}, activities:{}, classes:{},
  getStudent(id){ return this.students[id]||null; },
  setStudent(id,data){ this.students[id]=data; },
  invalidateStudent(id){ delete this.students[id]; },
  getActivity(id){ return this.activities[id]||null; },
  setActivity(id,data){ this.activities[id]=data; },
  clear(){ this.students={}; this.activities={}; this.classes={}; }
};

/* ============================================================
   2. SISTEMA TOAST — Substitueix alert() per toasts
   ============================================================ */
(function setupToasts(){
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;
    display:flex;flex-direction:column;gap:10px;pointer-events:none;max-width:calc(100vw - 48px)`;
  document.body.appendChild(container);

  const ICONS  = {success:'✅',error:'❌',warning:'⚠️',info:'ℹ️'};
  const COLORS = {
    success:{bg:'#f0fdf4',border:'#86efac',text:'#166534'},
    error:  {bg:'#fef2f2',border:'#fca5a5',text:'#991b1b'},
    warning:{bg:'#fffbeb',border:'#fcd34d',text:'#92400e'},
    info:   {bg:'#eff6ff',border:'#93c5fd',text:'#1e40af'},
  };

  function removeToast(el){
    clearTimeout(el._t);
    el.style.transform='translateX(120%)'; el.style.opacity='0';
    setTimeout(()=>el.remove(),300);
  }

  window.toast = function(msg, type='info', duration=3000){
    const c=COLORS[type]||COLORS.info, icon=ICONS[type]||ICONS.info;
    const el=document.createElement('div');
    el.style.cssText=`background:${c.bg};border:1.5px solid ${c.border};color:${c.text};
      padding:12px 18px;border-radius:12px;font-size:14px;font-weight:500;
      box-shadow:0 4px 16px rgba(0,0,0,0.12);display:flex;align-items:center;gap:10px;
      pointer-events:auto;cursor:pointer;transform:translateX(120%);
      transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),opacity 0.25s;
      opacity:0;max-width:360px;word-break:break-word;`;
    el.innerHTML=`<span style="font-size:18px;flex-shrink:0">${icon}</span><span>${msg}</span>`;
    el.addEventListener('click',()=>removeToast(el));
    container.appendChild(el);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      el.style.transform='translateX(0)'; el.style.opacity='1';
    }));
    el._t=setTimeout(()=>removeToast(el),duration);
  };

  window.toastLoading = function(msg){
    if(!document.getElementById('_tspin')){
      const s=document.createElement('style');s.id='_tspin';
      s.textContent=`@keyframes _tspin{to{transform:rotate(360deg)}}`;
      document.head.appendChild(s);
    }
    const el=document.createElement('div');
    el.style.cssText=`background:#eff6ff;border:1.5px solid #93c5fd;color:#1e40af;
      padding:12px 18px;border-radius:12px;font-size:14px;font-weight:500;
      box-shadow:0 4px 16px rgba(0,0,0,0.12);display:flex;align-items:center;gap:10px;
      pointer-events:none;transform:translateX(120%);
      transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),opacity 0.25s;opacity:0;max-width:360px;`;
    el.innerHTML=`<span style="width:18px;height:18px;border:2px solid #93c5fd;
      border-top-color:#1e40af;border-radius:50%;animation:_tspin 0.7s linear infinite;
      flex-shrink:0;display:inline-block"></span><span>${msg}</span>`;
    container.appendChild(el);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      el.style.transform='translateX(0)'; el.style.opacity='1';
    }));
    return { dismiss(){ el.style.transform='translateX(120%)';el.style.opacity='0';setTimeout(()=>el.remove(),300); } };
  };
})();

/* ============================================================
   3. FEEDBACK VISUAL AL GUARDAR (flash verd)
   ============================================================ */
(function setupSaveFeedback(){
  const s=document.createElement('style');
  s.textContent=`
    @keyframes _csaved{0%{background-color:#bbf7d0}100%{background-color:inherit}}
    @keyframes _cerror{0%,100%{background-color:inherit}25%,75%{background-color:#fecaca}}
    .cell-save-flash{animation:_csaved 1.2s ease-out forwards}
    .cell-error-flash{animation:_cerror 0.6s ease-out}`;
  document.head.appendChild(s);

  window.flashCellSaved=function(el){
    if(!el)return;
    el.classList.remove('cell-save-flash','cell-error-flash');
    void el.offsetWidth;
    el.classList.add('cell-save-flash');
    setTimeout(()=>el.classList.remove('cell-save-flash'),1200);
  };
  window.flashCellError=function(el){
    if(!el)return;
    el.classList.remove('cell-save-flash','cell-error-flash');
    void el.offsetWidth;
    el.classList.add('cell-error-flash');
    setTimeout(()=>el.classList.remove('cell-error-flash'),600);
  };
})();

/* ============================================================
   4. OBSERVADOR D'INPUTS → flash automàtic en guardar
   ============================================================ */
(function patchInputs(){
  const obs=new MutationObserver(()=>{
    document.querySelectorAll('#notesTbody input[data-activity-id]:not([data-fb])').forEach(inp=>{
      inp.dataset.fb='1';
      inp.addEventListener('change', async function(){
        const v=this.value;
        await new Promise(r=>setTimeout(r,150));
        if(v!==''&&!isNaN(Number(v))) window.flashCellSaved(this);
      });
    });
  });
  obs.observe(document.body,{childList:true,subtree:true});
})();

/* ============================================================
   5. PATCH alert() → toast
   ============================================================ */
(function patchAlert(){
  const _orig=window.alert;
  window.alert=function(msg){
    if(typeof msg==='string'&&msg.length<400){
      const l=msg.toLowerCase();
      let t='info';
      if(l.includes('error')||l.includes('fallat')||l.includes('incorrecte')) t='error';
      else if(l.includes('guardat')||l.includes('desat')||l.includes('creat')||l.includes('eliminat')||l.includes('email')) t='success';
      else if(l.includes('atenci')||l.includes('avis')||l.includes('segur')) t='warning';
      window.toast(msg,t,4500);
    } else { _orig.call(window,msg); }
  };
})();

/* ============================================================
   6. BANNER OFFLINE
   ============================================================ */
(function setupOffline(){
  const b=document.createElement('div');
  b.id='offline-banner';
  b.style.cssText=`position:fixed;top:0;left:0;right:0;background:#fef3c7;
    border-bottom:2px solid #f59e0b;color:#92400e;text-align:center;
    padding:8px 16px;font-size:13px;font-weight:600;z-index:10000;
    display:none;align-items:center;justify-content:center;gap:8px;`;
  b.innerHTML=`<span>⚡</span><span>Sense connexió — els canvis es sincronitzaran quan tornis a connectar-te</span>`;
  document.body.prepend(b);
  function update(){
    if(navigator.onLine){
      b.style.display='none';
      if(b.dataset.was){ window.toast('Connexió recuperada ✓','success'); delete b.dataset.was; }
    } else { b.style.display='flex'; b.dataset.was='1'; }
  }
  window.addEventListener('online',update);
  window.addEventListener('offline',update);
  update();
})();

/* ============================================================
   7. SKELETONS
   ============================================================ */
window.showClassesSkeleton=function(){
  const g=document.getElementById('classesGrid'); if(!g)return;
  g.innerHTML=Array(6).fill('').map(()=>`
    <div class="animate-pulse bg-white rounded-lg shadow p-4 space-y-3">
      <div class="h-5 bg-gray-200 rounded w-3/4"></div>
      <div class="h-4 bg-gray-200 rounded w-1/2"></div>
      <div class="h-3 bg-gray-100 rounded w-full mt-4"></div>
    </div>`).join('');
};
window.showNotesGridSkeleton=function(){
  const b=document.getElementById('notesTbody'); if(!b)return;
  const cols=Math.max(document.querySelectorAll('#notesThead th').length,4);
  b.innerHTML=Array(8).fill('').map(()=>`
    <tr class="animate-pulse">
      ${Array(cols).fill('').map((_,i)=>`<td class="border px-2 py-2">
        <div class="h-4 bg-gray-200 rounded ${i===0?'w-24':'w-10 mx-auto'}"></div>
      </td>`).join('')}
    </tr>`).join('');
};

/* ============================================================
   8. CSS: STICKY COLUMN + MOBILE FIXES
   ============================================================ */
(function injectCSS(){
  const s=document.createElement('style');
  s.id='improvements-css';
  s.textContent=`
    /* Sticky columna noms */
    #notesTable{border-collapse:separate!important;border-spacing:0!important}
    #notesThead th:first-child,
    #notesTbody td:first-child,
    #notesTfoot tr td:first-child,
    #formulaTfoot tr td:first-child{
      position:sticky!important;left:0!important;z-index:2!important;
      background:white!important;
      box-shadow:3px 0 8px -2px rgba(0,0,0,0.15)!important;
      min-width:110px;max-width:150px;
    }
    #notesThead th:first-child{z-index:4!important;background:#f3f4f6!important}
    #notesTfoot tr td:first-child,
    #formulaTfoot tr td:first-child{background:#f9fafb!important;z-index:3!important}

    /* Sticky capçaleres vertical */
    #notesThead th{
      position:sticky!important;top:0!important;z-index:1!important;
      background:#f3f4f6;box-shadow:0 2px 4px rgba(0,0,0,0.06);
    }
    #notesThead th:first-child{z-index:4!important}

    /* Fix iOS zoom: font ≥ 16px */
    @media(max-width:768px){
      input[type="number"],input[type="text"],input[type="email"],
      input[type="password"],select,textarea{font-size:16px!important}
      .menu-btn{min-width:44px!important;min-height:44px!important;
        display:inline-flex!important;align-items:center!important;justify-content:center!important}
      .table-input{min-width:50px!important;min-height:40px!important;padding:6px 2px!important}
      #notesTbody td:first-child{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    }

    /* Scroll suau */
    #notesTable-wrapper{-webkit-overflow-scrolling:touch;scroll-behavior:smooth;position:relative}

    /* Focus visible */
    .table-input:focus{outline:2px solid #6366f1!important;outline-offset:-1px!important;z-index:1;position:relative}

    /* Hover files */
    #notesTbody tr:hover{background-color:#f8fafc}
    #notesTbody tr:hover td:first-child{background:#f1f5f9!important}

    /* Scroll hint mòbil */
    .scroll-hint{display:none}
    @media(max-width:768px){
      .scroll-hint{display:flex;align-items:center;gap:6px;font-size:11px;
        color:#9ca3af;margin-bottom:6px;padding-left:4px;
        animation:_hfade 4s ease-out 2s forwards}
    }
    @keyframes _hfade{0%{opacity:1}100%{opacity:0;pointer-events:none}}

    /* Toast mòbil */
    @media(max-width:480px){
      #toast-container{bottom:16px!important;right:12px!important;
        left:12px!important;max-width:none!important;align-items:stretch!important}
    }

    /* Skeleton */
    @keyframes _skp{0%,100%{opacity:1}50%{opacity:0.4}}
    .animate-pulse{animation:_skp 1.5s ease-in-out infinite!important}

    /* Blocked cells */
    .blocked-cell{background-color:#f1f5f9!important;color:#94a3b8!important;cursor:not-allowed!important}

    /* Save flash */
    @keyframes _csaved{0%{background-color:#bbf7d0}100%{background-color:inherit}}
    @keyframes _cerror{0%,100%{background-color:inherit}25%,75%{background-color:#fecaca}}
    .cell-save-flash{animation:_csaved 1.2s ease-out forwards}
    .cell-error-flash{animation:_cerror 0.6s ease-out}

    /* Offline banner */
    #offline-banner{transition:all 0.3s}
  `;
  document.head.appendChild(s);
})();

/* ============================================================
   9. SCROLL HINT INSERCIÓ
   ============================================================ */
(function setupScrollHint(){
  const obs=new MutationObserver(()=>{
    const w=document.getElementById('notesTable-wrapper');
    if(!w||w.querySelector('.scroll-hint'))return;
    const h=document.createElement('div');
    h.className='scroll-hint';
    h.innerHTML=`<span>←</span><span>Llisca per veure totes les activitats</span><span>→</span>`;
    w.insertBefore(h,w.firstChild);
    w.addEventListener('scroll',()=>{if(w.scrollLeft>10)h.style.display='none';},{once:true});
  });
  obs.observe(document.body,{childList:true,subtree:true});
})();

/* ============================================================
   10. THROTTLE renderNotesGrid() — evitar crides redundants
   ============================================================ */
(function throttleRender(){
  let _p=null;
  const check=setInterval(()=>{
    if(typeof window.renderNotesGrid==='function'){
      clearInterval(check);
      const _o=window.renderNotesGrid;
      window.renderNotesGrid=function(...a){
        if(_p)return _p;
        _p=Promise.resolve().then(()=>{_p=null;return _o.apply(this,a);});
        return _p;
      };
      console.log('✅ renderNotesGrid throttled');
    }
  },300);
})();

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded',()=>{
  console.log('✅ improvements.js carregat');
  const g=document.getElementById('classesGrid');
  if(g&&g.children.length===0) window.showClassesSkeleton();
});
