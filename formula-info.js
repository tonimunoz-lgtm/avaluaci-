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

// ── Patcheig de capçaleres ────────────────────────────────────
async function patchHeaders() {
  if (!window.currentClassId) return;

  const db = window.firebase?.firestore?.();
  if (!db) return;

  let calculatedActs = {};
  try {
    const classDoc = await db.collection('classes').doc(window.currentClassId).get();
    calculatedActs = classDoc.exists ? (classDoc.data().calculatedActivities || {}) : {};
  } catch (e) { return; }

  const thead = document.getElementById('notesThead');
  if (!thead) return;

  const acts = window.classActivities || [];

  acts.forEach((actId, idx) => {
    const calcData = calculatedActs[actId];
    if (!calcData?.calculated) return; // només columnes amb fórmula

    // Trobar el <th> corresponent (idx+1 per la columna "Alumne")
    const allThs = thead.querySelectorAll('tr:first-child th');
    const thEl = allThs[idx + 1];
    if (!thEl) return;

    // Evitar duplicar
    if (thEl.querySelector('.fi-info-btn')) return;

    const displayFormula = calcData.displayFormula || calcData.formula || '';
    const rawFormula = calcData.formula || '';

    // Nom de l'activitat (el span dins el th)
    const actName = thEl.querySelector('span')?.textContent?.trim() || actId;

    // Crear botó ℹ️
    const btn = document.createElement('button');
    btn.className = 'fi-info-btn';
    btn.innerHTML = 'i';
    btn.title = `Fórmula: ${displayFormula}`;
    btn.setAttribute('aria-label', `Veure fórmula de ${actName}`);

    if (isTouchDevice()) {
      // Mòbil: tap obre modal
      btn.addEventListener('click', e => {
        e.stopPropagation();
        showMobileModal(actName, displayFormula, rawFormula);
      });
    } else {
      // Escriptori: hover mostra tooltip
      btn.addEventListener('mouseenter', () => showTooltip(btn, actName, displayFormula, rawFormula));
      btn.addEventListener('mouseleave', hideTooltip);
      // Clic també obre modal (per si volen llegir amb calma)
      btn.addEventListener('click', e => {
        e.stopPropagation();
        showMobileModal(actName, displayFormula, rawFormula);
      });
    }

    // Inserir el botó al container de la capçalera (al costat del nom)
    const container = thEl.querySelector('.flex');
    if (container) {
      // Inserir després del span del nom, abans del 🔄
      const spanName = container.querySelector('span');
      if (spanName) {
        spanName.after(btn);
      } else {
        container.appendChild(btn);
      }
    } else {
      thEl.appendChild(btn);
    }
  });
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
