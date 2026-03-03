// ============================================================
// improvements.js v2 — Correccions reals
// ============================================================

/* ============================================================
   1. OPTIMISTIC UPDATE — Notes s'actualitzen INSTANTÀNIAMENT
   Sobreescriu el comportament del change handler SENSE tocar app.js
   ============================================================ */
(function patchNoteInputs() {
  // Esperem que la taula existeixi
  const obs = new MutationObserver(() => {
    document
      .querySelectorAll('#notesTbody input[data-activity-id]:not([data-v2-patched])')
      .forEach(input => {
        input.dataset.v2Patched = 'true';

        // Flash visual immediat quan l'usuari escriu
        input.addEventListener('input', function() {
          applyCellColorSafe(this); // color en viu, sense esperar Firestore
        });

        // Change: guardem en background, UI ja actualitzada
        input.addEventListener('change', async function(e) {
          const val = e.target.value;
          const studentId = this.closest('tr[data-student-id]')?.dataset.studentId;
          const actId = this.dataset.activityId;
          if (!studentId || !actId) return;

          // 1. Color immediat (sense esperar)
          applyCellColorSafe(this);

          // 2. Actualitzar mitjanes localment (sense Firestore)
          updateAveragesLocal();

          // 3. Flash de "guardant"
          this.style.transition = 'box-shadow 0.2s';
          this.style.boxShadow = '0 0 0 2px #a5b4fc';

          try {
            // 4. Guardar a Firestore en background (NO bloquegem UI)
            const db = window._db || firebase.firestore();
            const num = val === '' ? null : Number(val);
            const updateObj = {};
            if (num === null || isNaN(num)) {
              updateObj[`notes.${actId}`] = firebase.firestore.FieldValue.delete();
            } else {
              updateObj[`notes.${actId}`] = num;
            }
            await db.collection('alumnes').doc(studentId).update(updateObj);

            // 5. Feedback positiu
            this.style.boxShadow = '0 0 0 2px #86efac';
            setTimeout(() => { this.style.boxShadow = ''; }, 800);

          } catch (err) {
            console.error('Error guardant nota:', err);
            // Feedback negatiu
            this.style.boxShadow = '0 0 0 2px #fca5a5';
            setTimeout(() => { this.style.boxShadow = ''; }, 1500);
            window.toast && window.toast('Error guardant la nota', 'error');
          }
          // NOTA: NO desactivem input mai. Queda sempre editable.
        }, true); // capture: true per interceptar ABANS del handler original
      });
  });
  obs.observe(document.body, { childList: true, subtree: true });
})();

/* Funció de color segura que no depèn de Tailwind conflictes */
function applyCellColorSafe(input) {
  const v = parseFloat(input.value);
  // Reset
  input.style.backgroundColor = '';
  input.classList.remove('bg-purple-100','bg-red-100','bg-yellow-100','bg-green-100');

  if (input.value === '' || isNaN(v)) return;

  // Usem style directe (més fiable que Tailwind classes amb !important al voltant)
  if (v < 2.5)      input.style.backgroundColor = '#fee2e2'; // red-100
  else if (v < 5)   input.style.backgroundColor = '#fef9c3'; // yellow-100
  else if (v < 7)   input.style.backgroundColor = '#ede9fe'; // purple-100
  else              input.style.backgroundColor = '#dcfce7'; // green-100
}

/* Actualitzar mitjanes localment sense llegir Firestore */
function updateAveragesLocal() {
  const tbody = document.getElementById('notesTbody');
  const tfoot = document.getElementById('notesTfoot');
  if (!tbody || !tfoot) return;

  const rows = Array.from(tbody.querySelectorAll('tr[data-student-id]'));
  if (rows.length === 0) return;

  // Trobar fila de mitjanes
  const avgRow = tfoot.querySelector('tr');
  if (!avgRow) return;

  // Per cada columna d'activitat (saltar primera = nom, última = comentaris)
  const firstRow = rows[0];
  const inputCount = firstRow.querySelectorAll('input[data-activity-id]').length;

  for (let i = 0; i < inputCount; i++) {
    const vals = rows
      .map(r => parseFloat(r.querySelectorAll('input[data-activity-id]')[i]?.value))
      .filter(v => !isNaN(v));
    const avg = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2) : '';

    // La cel·la avg està a la posició i+1 (saltar la primera "Mitjana activitat")
    const cell = avgRow.children[i + 1];
    if (cell) cell.textContent = avg;
  }
}


/* ============================================================
   2. CSS STICKY COLUMN — Versió correcta
   border-collapse: separate és OBLIGATORI per sticky funcioni
   ============================================================ */
(function injectCSS() {
  // Eliminar CSS anterior si existia
  const old = document.getElementById('improvements-css');
  if (old) old.remove();

  const style = document.createElement('style');
  style.id = 'improvements-css-v2';
  style.textContent = `

    /* === STICKY COLUMN: OBLIGATORI border-collapse:separate === */
    #notesTable {
      border-collapse: separate !important;
      border-spacing: 0 !important;
    }

    /* Cel·les sticky: columna esquerra (noms) */
    #notesTable thead tr th:first-child,
    #notesTable tbody tr td:first-child,
    #notesTable tfoot tr td:first-child {
      position: sticky !important;
      left: 0 !important;
      z-index: 2 !important;
    }

    /* Colors de fons per a cada secció */
    #notesTable thead tr th:first-child {
      background-color: #f3f4f6 !important; /* gray-100 */
      z-index: 4 !important;
    }
    #notesTable tbody tr td:first-child {
      background-color: #ffffff !important;
    }
    #notesTable tfoot tr td:first-child {
      background-color: #f9fafb !important; /* gray-50 */
      z-index: 3 !important;
    }
    /* Hover: la cel·la sticky hereta el hover */
    #notesTable tbody tr:hover td:first-child {
      background-color: #f8fafc !important;
    }

    /* Ombra per indicar que hi ha contingut a l'esquerra */
    #notesTable thead tr th:first-child,
    #notesTable tbody tr td:first-child,
    #notesTable tfoot tr td:first-child {
      box-shadow: 3px 0 6px -2px rgba(0,0,0,0.12) !important;
    }

    /* Mida mínima nom alumne */
    #notesTable tbody tr td:first-child {
      min-width: 110px;
      max-width: 150px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 13px;
    }

    /* Sticky capçaleres verticals */
    #notesTable thead th {
      position: sticky !important;
      top: 0 !important;
      z-index: 1 !important;
      background-color: #f3f4f6;
    }
    #notesTable thead th:first-child {
      z-index: 5 !important; /* el més alt: sticky en X i Y */
    }

    /* === El contenidor NECESSITA overflow-x: auto (no hidden) === */
    #notesTable-wrapper {
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch !important;
      position: relative;
    }
    /* Eliminar qualsevol overflow:hidden que pugui trencar sticky */
    #gridWrapper {
      overflow: visible !important;
    }

    /* === FIX iOS ZOOM: font-size mínim 16px === */
    @media (max-width: 768px) {
      #notesTable input,
      input[type="text"],
      input[type="email"],
      input[type="password"],
      input[type="number"],
      select, textarea {
        font-size: 16px !important;
        -webkit-text-size-adjust: 100%;
      }

      /* Botons menú: àrea tàctil mínima */
      button.menu-btn, .menu-btn {
        min-width: 44px !important;
        min-height: 44px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      /* Inputs de notes prou grans per tocar */
      #notesTable input {
        min-width: 48px !important;
        min-height: 38px !important;
        padding: 4px 2px !important;
      }
    }

    /* === FOCUS VISIBLE === */
    #notesTable input:focus {
      outline: 2px solid #6366f1 !important;
      outline-offset: -1px !important;
      z-index: 10 !important;
      position: relative !important;
    }

    /* === BLOCKED CELLS === */
    .blocked-cell {
      background-color: #f1f5f9 !important;
      color: #94a3b8 !important;
      cursor: not-allowed !important;
    }

    /* === HOVER FILES === */
    #notesTable tbody tr:hover {
      background-color: #f8fafc;
    }

    /* === SCROLL HINT MÒBIL === */
    .scroll-hint {
      display: none;
    }
    @media (max-width: 768px) {
      .scroll-hint {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: #9ca3af;
        margin-bottom: 6px;
        padding-left: 4px;
        animation: _hfade 4s ease-out 2s forwards;
      }
    }
    @keyframes _hfade { 0%{opacity:1} 100%{opacity:0;pointer-events:none} }

    /* === TOAST MÒBIL === */
    @media (max-width: 480px) {
      #toast-container {
        bottom: 16px !important;
        right: 12px !important;
        left: 12px !important;
        max-width: none !important;
        align-items: stretch !important;
      }
    }

    /* === SKELETON === */
    @keyframes _skp { 0%,100%{opacity:1} 50%{opacity:0.4} }
    .animate-pulse { animation: _skp 1.5s ease-in-out infinite !important; }

    /* === FEEDBACK GUARDAR === */
    @keyframes _csaved { 0%{box-shadow:0 0 0 3px #86efac} 100%{box-shadow:none} }
    .cell-save-flash { animation: _csaved 0.8s ease-out forwards; }

  `;
  document.head.appendChild(style);

  // Forçar que el wrapper tingui overflow-x correcte
  const wrapper = document.getElementById('notesTable-wrapper');
  if (wrapper) {
    wrapper.style.overflowX = 'auto';
    wrapper.style.webkitOverflowScrolling = 'touch';
  }
  const gridWrapper = document.getElementById('gridWrapper');
  if (gridWrapper) {
    gridWrapper.style.overflow = 'visible';
    gridWrapper.style.width = '100%';
  }
})();


/* ============================================================
   3. TOASTS
   ============================================================ */
(function setupToasts() {
  if (document.getElementById('toast-container')) return;

  const container = document.createElement('div');
  container.id = 'toast-container';
  container.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    display:flex;flex-direction:column;gap:10px;
    pointer-events:none;max-width:calc(100vw - 48px);
  `;
  document.body.appendChild(container);

  const ICONS  = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  const COLORS = {
    success:{ bg:'#f0fdf4', border:'#86efac', text:'#166534' },
    error:  { bg:'#fef2f2', border:'#fca5a5', text:'#991b1b' },
    warning:{ bg:'#fffbeb', border:'#fcd34d', text:'#92400e' },
    info:   { bg:'#eff6ff', border:'#93c5fd', text:'#1e40af' },
  };

  function remove(el) {
    clearTimeout(el._t);
    el.style.transform='translateX(120%)'; el.style.opacity='0';
    setTimeout(()=>el.remove(), 300);
  }

  window.toast = function(msg, type='info', duration=3000) {
    const c = COLORS[type]||COLORS.info, icon = ICONS[type]||ICONS.info;
    const el = document.createElement('div');
    el.style.cssText=`background:${c.bg};border:1.5px solid ${c.border};color:${c.text};
      padding:12px 18px;border-radius:12px;font-size:14px;font-weight:500;
      box-shadow:0 4px 16px rgba(0,0,0,0.12);display:flex;align-items:center;gap:10px;
      pointer-events:auto;cursor:pointer;transform:translateX(120%);
      transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),opacity 0.25s;
      opacity:0;max-width:360px;word-break:break-word;`;
    el.innerHTML=`<span style="font-size:18px;flex-shrink:0">${icon}</span><span>${msg}</span>`;
    el.addEventListener('click', ()=>remove(el));
    container.appendChild(el);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      el.style.transform='translateX(0)'; el.style.opacity='1';
    }));
    el._t = setTimeout(()=>remove(el), duration);
  };
})();


/* ============================================================
   4. PATCH alert() → toast
   ============================================================ */
(function patchAlert() {
  const _orig = window.alert;
  window.alert = function(msg) {
    if (typeof msg === 'string' && msg.length < 400) {
      const l = msg.toLowerCase();
      let t = 'info';
      if (l.includes('error') || l.includes('fallat'))  t = 'error';
      else if (l.includes('guardat') || l.includes('desat') || l.includes('creat') || l.includes('eliminat')) t = 'success';
      else if (l.includes('segur') || l.includes('atenció')) t = 'warning';
      window.toast(msg, t, 4500);
    } else {
      _orig.call(window, msg);
    }
  };
})();


/* ============================================================
   5. BANNER OFFLINE
   ============================================================ */
(function setupOffline() {
  if (document.getElementById('offline-banner')) return;
  const b = document.createElement('div');
  b.id = 'offline-banner';
  b.style.cssText = `position:fixed;top:0;left:0;right:0;background:#fef3c7;
    border-bottom:2px solid #f59e0b;color:#92400e;text-align:center;
    padding:8px 16px;font-size:13px;font-weight:600;z-index:10000;
    display:none;align-items:center;justify-content:center;gap:8px;`;
  b.innerHTML = `<span>⚡</span><span>Sense connexió — els canvis es sincronitzaran quan tornis</span>`;
  document.body.prepend(b);
  function update() {
    if (navigator.onLine) {
      b.style.display='none';
      if (b.dataset.was) { window.toast&&window.toast('Connexió recuperada ✓','success'); delete b.dataset.was; }
    } else { b.style.display='flex'; b.dataset.was='1'; }
  }
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
})();


/* ============================================================
   6. SKELETONS
   ============================================================ */
window.showClassesSkeleton = function() {
  const g = document.getElementById('classesGrid'); if (!g) return;
  g.innerHTML = Array(6).fill('').map(()=>`
    <div class="animate-pulse bg-white rounded-lg shadow p-4 space-y-3">
      <div class="h-5 bg-gray-200 rounded w-3/4"></div>
      <div class="h-4 bg-gray-200 rounded w-1/2"></div>
      <div class="h-3 bg-gray-100 rounded w-full mt-4"></div>
    </div>`).join('');
};


/* ============================================================
   7. SCROLL HINT MÒBIL
   ============================================================ */
(function setupScrollHint() {
  const obs = new MutationObserver(()=>{
    const w = document.getElementById('notesTable-wrapper');
    if (!w || w.querySelector('.scroll-hint')) return;
    const h = document.createElement('div');
    h.className = 'scroll-hint';
    h.innerHTML = `<span>←</span><span>Llisca per veure totes les activitats</span><span>→</span>`;
    w.insertBefore(h, w.firstChild);
    w.addEventListener('scroll', ()=>{ if(w.scrollLeft>10) h.style.display='none'; }, {once:true});
  });
  obs.observe(document.body, {childList:true, subtree:true});
})();


/* ============================================================
   8. FIX COLORS EXISTENTS: re-aplicar applyCellColorSafe
   a tots els inputs quan la taula es carrega
   ============================================================ */
(function fixExistingColors() {
  const obs = new MutationObserver(()=>{
    document.querySelectorAll('#notesTbody input[data-activity-id]').forEach(inp=>{
      if (inp.value !== '') applyCellColorSafe(inp);
    });
    // Re-forçar overflow del wrapper per sticky
    const w = document.getElementById('notesTable-wrapper');
    if (w && w.style.overflow === 'hidden') {
      w.style.overflow = 'auto';
      w.style.overflowX = 'auto';
    }
  });
  obs.observe(document.getElementById('notesTbody') || document.body, {childList:true, subtree:true});
})();


/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', ()=>{
  console.log('✅ improvements.js v2 carregat');

  // Forçar overflow correcte immediatament
  setTimeout(()=>{
    const w = document.getElementById('notesTable-wrapper');
    if (w) { w.style.overflowX='auto'; w.style.webkitOverflowScrolling='touch'; }
    const gw = document.getElementById('gridWrapper');
    if (gw) { gw.style.overflow='visible'; }
  }, 500);
});
