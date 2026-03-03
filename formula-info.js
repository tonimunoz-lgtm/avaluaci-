// formula-info.js
// Afegeix una icona ℹ️ a les capçaleres de columnes amb fórmula.
// - Escriptori: tooltip enriquit al hover
// - Mòbil: popup al tap (detectat per touch)
// No modifica cap fitxer existent.

console.log('✅ formula-info.js carregat');

// ── Detectar mòbil ────────────────────────────────────────────
const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

// ── Injectar estils globals ───────────────────────────────────
const style = document.createElement('style');
style.textContent = `
  .fi-info-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #3b82f6;
    color: white;
    font-size: 11px;
    font-weight: bold;
    cursor: pointer;
    margin-left: 4px;
    flex-shrink: 0;
    border: none;
    line-height: 1;
    font-style: normal;
    transition: background 0.15s;
    vertical-align: middle;
  }
  .fi-info-btn:hover { background: #1d4ed8; }

  /* Tooltip escriptori */
  .fi-tooltip {
    position: fixed;
    z-index: 99999;
    background: #1e293b;
    color: #f1f5f9;
    border-radius: 8px;
    padding: 10px 14px;
    max-width: 320px;
    font-size: 12px;
    line-height: 1.6;
    box-shadow: 0 4px 20px rgba(0,0,0,0.35);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s;
  }
  .fi-tooltip.visible { opacity: 1; }
  .fi-tooltip .fi-tt-title {
    font-weight: 700;
    font-size: 13px;
    margin-bottom: 4px;
    color: #93c5fd;
  }
  .fi-tooltip .fi-tt-formula {
    font-family: monospace;
    background: #0f172a;
    border-radius: 4px;
    padding: 4px 8px;
    margin-top: 4px;
    word-break: break-all;
    color: #86efac;
  }

  /* Modal mòbil */
  .fi-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    z-index: 99998;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    animation: fi-fadein 0.15s ease;
  }
  .fi-modal-sheet {
    background: white;
    border-radius: 16px 16px 0 0;
    padding: 20px 20px 32px;
    width: 100%;
    max-width: 480px;
    animation: fi-slidein 0.2s ease;
  }
  .fi-modal-sheet h3 {
    font-size: 15px;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 4px;
  }
  .fi-modal-sheet .fi-act-name {
    font-size: 13px;
    color: #64748b;
    margin-bottom: 12px;
  }
  .fi-modal-sheet .fi-formula-box {
    background: #0f172a;
    color: #86efac;
    font-family: monospace;
    font-size: 13px;
    border-radius: 8px;
    padding: 12px;
    word-break: break-all;
    margin-bottom: 16px;
  }
  .fi-modal-sheet .fi-close-btn {
    width: 100%;
    padding: 12px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
  }
  .fi-modal-sheet .fi-close-btn:active { background: #1d4ed8; }
  @keyframes fi-fadein { from { opacity: 0 } to { opacity: 1 } }
  @keyframes fi-slidein { from { transform: translateY(60px) } to { transform: translateY(0) } }
`;
document.head.appendChild(style);

// ── Tooltip singleton ─────────────────────────────────────────
const tooltip = document.createElement('div');
tooltip.className = 'fi-tooltip';
document.body.appendChild(tooltip);

function showTooltip(btn, actName, displayFormula, rawFormula) {
  tooltip.innerHTML = `
    <div class="fi-tt-title">📐 Fórmula: ${escHtml(actName)}</div>
    <div class="fi-tt-formula">${escHtml(displayFormula || rawFormula || '—')}</div>
  `;
  positionTooltip(btn);
  tooltip.classList.add('visible');
}

function hideTooltip() {
  tooltip.classList.remove('visible');
}

function positionTooltip(btn) {
  const rect = btn.getBoundingClientRect();
  const tw = 320;
  let left = rect.left + rect.width / 2 - tw / 2;
  let top = rect.bottom + 8;

  // Evitar sortir per la dreta
  if (left + tw > window.innerWidth - 8) left = window.innerWidth - tw - 8;
  if (left < 8) left = 8;
  // Evitar sortir per baix
  if (top + 120 > window.innerHeight) top = rect.top - 120 - 8;

  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
  tooltip.style.width = tw + 'px';
}

// ── Modal mòbil ───────────────────────────────────────────────
function showMobileModal(actName, displayFormula, rawFormula) {
  const overlay = document.createElement('div');
  overlay.className = 'fi-modal-overlay';
  overlay.innerHTML = `
    <div class="fi-modal-sheet">
      <div class="fi-act-name">Columna calculada</div>
      <h3>📐 ${escHtml(actName)}</h3>
      <div class="fi-formula-box">${escHtml(displayFormula || rawFormula || '—')}</div>
      <button class="fi-close-btn">Tancar</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('.fi-close-btn').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}

// ── Obtenir classId des del DOM (igual que auto-recalc.js) ───
function getClassId() {
  const sub = document.getElementById('classSub');
  if (!sub) return null;
  const m = (sub.textContent || '').match(/ID:\s*(\S+)/);
  return m ? m[1] : null;
}

// ── Patcheig de capçaleres ────────────────────────────────────
// No depèn de window.currentClassId ni window.classActivities:
// llegeix directament del DOM (th amb data-activity-id o posició)
// i de Firestore via getClassId()
async function patchHeaders() {
  const classId = getClassId();
  if (!classId) return;

  const thead = document.getElementById('notesThead');
  if (!thead) return;

  // Necessitem calculatedActivities de Firestore
  const db = window.firebase?.firestore?.();
  if (!db) return;

  let calculatedActs = {};
  try {
    const classDoc = await db.collection('classes').doc(classId).get();
    if (!classDoc.exists) return;
    calculatedActs = classDoc.data().calculatedActivities || {};
  } catch (e) { return; }

  // Iterar sobre tots els <th> de la capçalera
  const allThs = thead.querySelectorAll('tr:first-child th');

  allThs.forEach(thEl => {
    // Evitar duplicar
    if (thEl.querySelector('.fi-info-btn')) return;

    // Trobar l'activityId: pot estar a data-activity-id (posat per competencial-config)
    // o el deduïm buscant el lockIcon i mirant si té calcData
    let actId = thEl.dataset.activityId;

    // Si no té data-activity-id, intentar-ho per posició vs calculatedActs
    // Busquem si algun calcData coincideix amb el nom del span
    if (!actId) {
      const spanText = thEl.querySelector('span')?.textContent?.trim();
      if (!spanText) return;
      // Buscar actId per nom a calculatedActs (displayFormula conté el nom)
      // Alternativa: mirar si el th té fons blau (és calculat)
      if (!thEl.style.backgroundColor?.includes('219') && 
          !thEl.style.background?.includes('dbeafe') &&
          thEl.style.backgroundColor !== 'rgb(219, 234, 254)') return;
    }

    // Si tenim actId, verificar que és calculat
    if (actId) {
      const calcData = calculatedActs[actId];
      if (!calcData || !calcData.formula) return;
      addInfoBtn(thEl, calcData, actId);
      return;
    }

    // Sense actId: buscar per fons blau de capçalera calculada i nom
    // (fallback per capçaleres sense data-activity-id)
    const spanText = thEl.querySelector('span')?.textContent?.trim();
    if (!spanText) return;

    // Buscar entre les activitats calculades aquella amb displayFormula que conté el nom
    for (const [id, data] of Object.entries(calculatedActs)) {
      if (!data.formula) continue;
      // El nom de l'activitat apareix al span del th
      // Intentem fer match per nom
      const display = data.displayFormula || '';
      // Si el th té background blau és calculat
      const bgBlue = thEl.style.backgroundColor === 'rgb(219, 234, 254)' ||
                     thEl.getAttribute('style')?.includes('dbeafe');
      if (bgBlue) {
        // Agafar el primer que trobem (heurística per capçaleres sense actId)
        if (!thEl.dataset.fiActId) {
          thEl.dataset.fiActId = id;
          addInfoBtn(thEl, data, id);
          break;
        }
      }
    }
  });
}

function addInfoBtn(thEl, calcData, actId) {
  if (thEl.querySelector('.fi-info-btn')) return; // ja té

  const displayFormula = calcData.displayFormula || calcData.formula || '';
  const rawFormula = calcData.formula || '';
  const actName = thEl.querySelector('span')?.textContent?.trim() || actId;

  const btn = document.createElement('button');
  btn.className = 'fi-info-btn';
  btn.innerHTML = 'i';
  btn.title = `Fórmula: ${displayFormula}`;
  btn.setAttribute('aria-label', `Veure fórmula de ${actName}`);

  if (isTouchDevice()) {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      showMobileModal(actName, displayFormula, rawFormula);
    });
  } else {
    btn.addEventListener('mouseenter', () => showTooltip(btn, actName, displayFormula, rawFormula));
    btn.addEventListener('mouseleave', hideTooltip);
    btn.addEventListener('click', e => {
      e.stopPropagation();
      showMobileModal(actName, displayFormula, rawFormula);
    });
  }

  const container = thEl.querySelector('.flex');
  if (container) {
    const spanName = container.querySelector('span');
    if (spanName) spanName.after(btn);
    else container.appendChild(btn);
  } else {
    thEl.appendChild(btn);
  }
}

// ── Observer: re-patchejar quan es recrea la capçalera ────────
// Estratègia: observar notesTbody (sempre canvia amb renderNotesGrid)
// i notesThead amb subtree per detectar quan s'afegeixen els <th>

let _patchScheduled = false;

function schedulePatch() {
  if (_patchScheduled) return;
  _patchScheduled = true;
  setTimeout(() => {
    _patchScheduled = false;
    patchHeaders();
  }, 500);
}

function startObserving() {
  // Observar notesTbody: quan es recrea el cos, la capçalera ja és llesta
  const tbody = document.getElementById('notesTbody');
  if (tbody) {
    new MutationObserver(schedulePatch).observe(tbody, { childList: true });
  }

  // Observar notesThead amb subtree per detectar quan s'afegeixen th
  const thead = document.getElementById('notesThead');
  if (thead) {
    new MutationObserver(schedulePatch).observe(thead, { childList: true, subtree: true });
  }

  // Patcheig immediat per si ja hi ha contingut
  patchHeaders();
}

// Intentar iniciar l'observació repetidament fins que existeixin els elements
function tryStart() {
  const tbody = document.getElementById('notesTbody');
  const thead = document.getElementById('notesThead');
  if (tbody && thead) {
    startObserving();
  } else {
    setTimeout(tryStart, 500);
  }
}

document.addEventListener('DOMContentLoaded', () => setTimeout(tryStart, 800));

// ── Helper ────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

console.log('📐 formula-info.js: llest');
