// competencial-config.js
// Injector que millora el sistema competencial:
// 1. Notes numèriques 1-4 (en lloc de selects NA/AS/AN/AE)
// 2. Fórmules entre activitats competencials
// 3. Configuració de trams per professor (guardada a Firestore)
// 4. Conversió automàtica numèric → NA/AS/AN/AE per activitats calculades

console.log('✅ competencial-config.js carregat');

// ============================================================
// CONFIG PER DEFECTE DELS TRAMS
// ============================================================
const DEFAULT_TRAMS = {
  NA:  { min: 1,   max: 1.99 },
  AS:  { min: 2,   max: 2.49 },
  AN:  { min: 2.5, max: 2.99 },
  AE:  { min: 3,   max: 4    }
};

const COMP_COLORS = {
  NA: { bg: '#ef4444', text: '#fff' },
  AS: { bg: '#f97316', text: '#fff' },
  AN: { bg: '#eab308', text: '#000' },
  AE: { bg: '#22c55e', text: '#fff' }
};

// Trams carregats per l'usuari actual
let _trams = null;
let _professorUID = null;
let _db = null;

// ============================================================
// INICIALITZACIÓ
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(init, 1500);
});

async function init() {
  _db = window.firebase?.firestore?.();
  if (!_db) { setTimeout(init, 500); return; }

  // Esperar que hi hagi un usuari autenticat
  firebase.auth().onAuthStateChanged(async user => {
    if (!user) return;
    _professorUID = user.uid;
    _trams = await loadTrams();
    injectConfigButton();
    console.log('🎓 competencial-config.js inicialitzat, trams:', _trams);
  });
}

// ============================================================
// CÀRREGA I GUARDADA DELS TRAMS A FIRESTORE
// ============================================================
async function loadTrams() {
  try {
    const doc = await _db.collection('professors').doc(_professorUID).get();
    const saved = doc.exists ? doc.data().competencyTrams : null;
    return saved || { ...DEFAULT_TRAMS };
  } catch (e) {
    console.error('Error carregant trams:', e);
    return { ...DEFAULT_TRAMS };
  }
}

async function saveTrams(trams) {
  try {
    await _db.collection('professors').doc(_professorUID).update({ competencyTrams: trams });
    _trams = trams;
    // Invalida cache de notes mostrades
    document.querySelectorAll('[data-comp-display="true"]').forEach(el => {
      const val = parseFloat(el.dataset.numericVal);
      if (!isNaN(val)) {
        const badge = numericToCompetency(val, trams);
        applyBadgeStyle(el, badge);
      }
    });
    console.log('✅ Trams guardats');
  } catch (e) {
    console.error('Error guardant trams:', e);
    alert('Error guardant configuració: ' + e.message);
  }
}

// ============================================================
// CONVERSIÓ NUMÈRIC → QUALIFICACIÓ COMPETENCIAL
// ============================================================
function numericToCompetency(val, trams) {
  trams = trams || _trams || DEFAULT_TRAMS;
  for (const [label, range] of Object.entries(trams)) {
    if (val >= range.min && val <= range.max) return label;
  }
  // Fallback: el més proper
  if (val < trams.NA.min) return 'NA';
  if (val > trams.AE.max) return 'AE';
  return 'NA';
}

function applyBadgeStyle(el, badge) {
  const c = COMP_COLORS[badge] || { bg: '#ccc', text: '#000' };
  el.textContent = badge || '-';
  el.style.backgroundColor = badge ? c.bg : '#f3f4f6';
  el.style.color = badge ? c.text : '#555';
  el.dataset.badge = badge || '';
}

// ============================================================
// BOTÓ DE CONFIGURACIÓ (injectat a la barra d'eines)
// ============================================================
function injectConfigButton() {
  if (document.getElementById('btnCompConfig')) return;

  // Esperar que existeixi la barra de botons de classe
  const tryInject = () => {
    // Busquem un contenidor adequat - la barra de botons principal
    const toolbar = document.querySelector('#classActions') ||
                    document.querySelector('.class-toolbar') ||
                    document.querySelector('#btnAddActivity')?.parentElement;

    if (!toolbar) {
      setTimeout(tryInject, 800);
      return;
    }

    const btn = document.createElement('button');
    btn.id = 'btnCompConfig';
    btn.className = 'px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold text-sm flex items-center gap-1';
    btn.innerHTML = '🎯 Config Competencial';
    btn.title = 'Configura els trams NA/AS/AN/AE';
    btn.addEventListener('click', () => openConfigModal());
    toolbar.appendChild(btn);
    console.log('✅ Botó Config Competencial injectat');
  };

  setTimeout(tryInject, 800);
}

// ============================================================
// MODAL DE CONFIGURACIÓ DELS TRAMS
// ============================================================
function openConfigModal() {
  // Eliminar modal anterior si existeix
  document.getElementById('compConfigModal')?.remove();

  const trams = _trams || DEFAULT_TRAMS;
  const modal = document.createElement('div');
  modal.id = 'compConfigModal';
  modal.className = 'fixed inset-0 flex items-center justify-center z-[9999] bg-black bg-opacity-50';

  modal.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold text-gray-900">⚙️ Configuració Competencial</h2>
        <button id="btnCloseCompConfig" class="text-gray-400 hover:text-gray-700 text-2xl leading-none">✕</button>
      </div>

      <p class="text-sm text-gray-600 mb-4">
        Les activitats competencials utilitzen notes <strong>numèriques de l'1 al 4</strong>.
        Configura aquí els trams per convertir-les a NA / AS / AN / AE.
      </p>

      <div class="space-y-3 mb-6" id="tramsContainer">
        ${['NA','AS','AN','AE'].map(label => `
          <div class="flex items-center gap-3 p-3 rounded-lg border-2" style="border-color: ${COMP_COLORS[label].bg}; background: ${COMP_COLORS[label].bg}18">
            <span class="inline-block w-10 text-center font-bold text-white text-sm px-2 py-1 rounded" style="background:${COMP_COLORS[label].bg}; color:${COMP_COLORS[label].text}">
              ${label}
            </span>
            <span class="text-sm text-gray-600 w-20">Des de:</span>
            <input type="number" id="tram_${label}_min" step="0.01" min="1" max="4"
              value="${trams[label].min}"
              class="border rounded px-2 py-1 w-24 text-center focus:ring-2 focus:ring-purple-400">
            <span class="text-sm text-gray-600">Fins a:</span>
            <input type="number" id="tram_${label}_max" step="0.01" min="1" max="4"
              value="${trams[label].max}"
              class="border rounded px-2 py-1 w-24 text-center focus:ring-2 focus:ring-purple-400">
          </div>
        `).join('')}
      </div>

      <div id="tramError" class="hidden text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-3"></div>

      <div class="flex gap-2 justify-between items-center">
        <button id="btnResetTrams" class="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded font-medium">
          Restaurar per defecte
        </button>
        <div class="flex gap-2">
          <button id="btnCancelCompConfig" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded font-semibold">
            Cancel·lar
          </button>
          <button id="btnSaveTrams" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold">
            💾 Guardar
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('btnCloseCompConfig').addEventListener('click', () => modal.remove());
  document.getElementById('btnCancelCompConfig').addEventListener('click', () => modal.remove());
  document.getElementById('btnResetTrams').addEventListener('click', () => {
    ['NA','AS','AN','AE'].forEach(label => {
      document.getElementById(`tram_${label}_min`).value = DEFAULT_TRAMS[label].min;
      document.getElementById(`tram_${label}_max`).value = DEFAULT_TRAMS[label].max;
    });
  });

  document.getElementById('btnSaveTrams').addEventListener('click', async () => {
    const errorDiv = document.getElementById('tramError');
    const newTrams = {};

    let valid = true;
    for (const label of ['NA','AS','AN','AE']) {
      const min = parseFloat(document.getElementById(`tram_${label}_min`).value);
      const max = parseFloat(document.getElementById(`tram_${label}_max`).value);
      if (isNaN(min) || isNaN(max) || min > max || min < 1 || max > 4) {
        errorDiv.textContent = `Error al tram ${label}: valors incorrectes (han d'estar entre 1 i 4, i min ≤ max)`;
        errorDiv.classList.remove('hidden');
        valid = false;
        break;
      }
      newTrams[label] = { min, max };
    }

    if (!valid) return;
    errorDiv.classList.add('hidden');

    await saveTrams(newTrams);
    modal.remove();
    showToastComp('✅ Configuració guardada correctament');
  });

  // Tancar clicant fora
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

// ============================================================
// TOAST SIMPLE
// ============================================================
function showToastComp(msg) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl z-[99999] text-sm font-medium';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ============================================================
// PARCHEAR INPUTS COMPETENCIALS: NUMÈRICS 1-4 en lloc de selects
// ============================================================

// Interceptem el patchCompetencyInputs original de competencial.js
// Esperem que estigui carregat i el sobreescrivim
const waitForOriginalPatch = () => {
  // Observem quan es creen nous inputs competencials
  // El nostre observer substitueix els selects per inputs numèrics 1-4
  const numericObserver = new MutationObserver(() => {
    setTimeout(upgradeCompetencySelects, 100);
  });

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      numericObserver.observe(document.body, { childList: true, subtree: true });
    }, 2000);
  });
};

waitForOriginalPatch();

// Substitueix els selects competencials (NA/AS/AN/AE) per inputs numèrics 1-4
async function upgradeCompetencySelects() {
  const selects = document.querySelectorAll('select.competency-select:not([data-upgraded="true"])');
  if (selects.length === 0) return;

  for (const sel of selects) {
    sel.dataset.upgraded = 'true';
    const activityId = sel.dataset.activityId;
    const studentId = sel.dataset.studentId;
    if (!activityId || !studentId) continue;

    // Llegir valor numèric actual guardat
    let numericVal = null;
    try {
      const studentDoc = await _db.collection('alumnes').doc(studentId).get();
      const rawVal = studentDoc.exists ? studentDoc.data().notes?.[activityId] : null;
      numericVal = rawVal !== undefined && rawVal !== null ? parseFloat(rawVal) : null;
    } catch (e) { /* no crític */ }

    // Crear input numèric 1-4
    const wrapper = document.createElement('div');
    wrapper.className = 'comp-cell-wrapper flex flex-col items-center gap-0.5';
    wrapper.style.minWidth = '70px';

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.max = '4';
    input.step = '0.01';
    input.className = 'border rounded px-1 py-0.5 w-full text-center text-sm font-semibold focus:ring-2 focus:ring-purple-400';
    input.style.width = '70px';
    input.dataset.activityId = activityId;
    input.dataset.studentId = studentId;
    input.dataset.isCompetencyNumeric = 'true';
    input.placeholder = '1-4';
    if (numericVal !== null && !isNaN(numericVal)) {
      input.value = numericVal;
    }

    // Badge de qualificació competencial (mostra NA/AS/AN/AE)
    const badge = document.createElement('span');
    badge.className = 'comp-badge text-xs font-bold px-2 py-0.5 rounded w-full text-center';
    badge.style.minWidth = '44px';
    badge.dataset.compDisplay = 'true';
    badge.dataset.numericVal = numericVal ?? '';

    if (numericVal !== null && !isNaN(numericVal)) {
      const label = numericToCompetency(numericVal);
      applyBadgeStyle(badge, label);
    } else {
      applyBadgeStyle(badge, null);
      badge.textContent = '-';
    }

    // Guardar nota numèrica i actualitzar badge
    input.addEventListener('change', async () => {
      const val = parseFloat(input.value);
      if (isNaN(val) || val < 1 || val > 4) {
        input.value = '';
        applyBadgeStyle(badge, null);
        badge.textContent = '-';
        badge.dataset.numericVal = '';
        // Esborrar nota
        try {
          await _db.collection('alumnes').doc(studentId).update({
            [`notes.${activityId}`]: firebase.firestore.FieldValue.delete()
          });
        } catch (e) { console.error('Error esborrant nota:', e); }
        return;
      }
      const rounded = Math.round(val * 100) / 100;
      input.value = rounded;
      const label = numericToCompetency(rounded);
      applyBadgeStyle(badge, label);
      badge.dataset.numericVal = rounded;
      // Guardar a Firestore com a numèric (en notes, com la resta)
      try {
        await _db.collection('alumnes').doc(studentId).update({
          [`notes.${activityId}`]: rounded
        });
      } catch (e) { console.error('Error guardant nota competencial numèrica:', e); }
    });

    wrapper.appendChild(input);
    wrapper.appendChild(badge);

    try {
      sel.parentNode.replaceChild(wrapper, sel);
    } catch (e) { console.error('Error substituint select:', e); }
  }
}

// ============================================================
// PERMETRE FÓRMULES EN ACTIVITATS COMPETENCIALS
// ============================================================
// Eliminem el bloqueig que fa competencial.js sobre els botons de fórmula
// per activitats competencials. Substituïm disableCompetencyButtons per
// una versió que no bloqueji, sinó que marqui visualment que són competencials.

const patchFormulaButtons = () => {
  const tryPatch = () => {
    // Interceptem buildActivityButtons per netejar el bloqueig de competencials
    const originalBAB = window.buildActivityButtons;
    if (!originalBAB) { setTimeout(tryPatch, 500); return; }

    // Ja patchejat per competencial.js, ara el re-interceptem
    const prevBuildActivityButtons = window.buildActivityButtons;
    window.buildActivityButtons = async function(...args) {
      await prevBuildActivityButtons.apply(this, args);
      // Après de construir els botons, re-habilitem els competencials (que competencial.js desactiva)
      // i els marquem amb un estil diferent
      setTimeout(reEnableCompetencyButtons, 200);
    };
    console.log('✅ buildActivityButtons re-patchejat per permetre competencials en fórmules');
  };
  setTimeout(tryPatch, 2000);
};

patchFormulaButtons();

async function reEnableCompetencyButtons() {
  try {
    if (!_db) return;
    const snapshot = await _db.collection('activitats')
      .where('evaluationType', '==', 'competency')
      .get();
    const compIds = new Set(snapshot.docs.map(d => d.id));

    const buttons = document.querySelectorAll('.activity-buttons-container button[type="button"]');
    for (const btn of buttons) {
      // Comprovar si és competencial per ID
      // L'ID està guardat al title del botó (afegit a app.js: btn.title = `ID: ${aid}`)
      const titleMatch = btn.title?.match(/ID: (.+)/);
      if (!titleMatch) continue;
      const actId = titleMatch[1];

      if (compIds.has(actId)) {
        // Re-habilitar però marcar visualment com a competencial
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.style.pointerEvents = 'auto';
        btn.style.backgroundColor = '#d8b4fe'; // violet-300
        btn.style.border = '2px solid #7c3aed';
        btn.title = `${btn.title} · Competencial (1-4)`;
      }
    }
  } catch (e) {
    console.error('Error re-habilitant botons competencials:', e);
  }
}

// ============================================================
// AFEGIR OPCIÓ "APLICA TRAMS COMPETENCIALS" A LA CALCULADORA
// La calculadora numèrica permet calcular la mitjana (1-4) i
// convertir-la automàticament a NA/AS/AN/AE com a display.
// ============================================================

// Interceptar openCalcModal per afegir l'opció de conversió
const patchCalcModal = () => {
  const tryPatch = () => {
    const calcTypeSelect = document.getElementById('calcType');
    if (!calcTypeSelect) { setTimeout(tryPatch, 500); return; }

    // Afegir opció "competencial" al select de tipus
    if (!calcTypeSelect.querySelector('option[value="competency_convert"]')) {
      const opt = document.createElement('option');
      opt.value = 'competency_convert';
      opt.textContent = 'Fórmula Competencial (→ NA/AS/AN/AE)';
      calcTypeSelect.appendChild(opt);
    }

    // Interceptar el botó Aplica per gestionar el nou tipus
    const applyBtn = document.getElementById('modalApplyCalcBtn');
    if (applyBtn && !applyBtn.dataset.compPatched) {
      applyBtn.dataset.compPatched = 'true';
      applyBtn.addEventListener('click', handleCompetencyCalc, true); // capture: true per anar primer
    }

    console.log('✅ Modal calculadora patchejat per competencial');
  };
  setTimeout(tryPatch, 1000);
};

patchCalcModal();

// També re-patchejar cada cop que s'obre el modal (per si es recrea)
document.addEventListener('click', e => {
  if (e.target?.closest('[data-modal-close="modalCalc"]') || e.target?.id === 'modalApplyCalcBtn') return;
  setTimeout(() => {
    const calcTypeSelect = document.getElementById('calcType');
    if (calcTypeSelect && !calcTypeSelect.querySelector('option[value="competency_convert"]')) {
      const opt = document.createElement('option');
      opt.value = 'competency_convert';
      opt.textContent = 'Fórmula Competencial (→ NA/AS/AN/AE)';
      calcTypeSelect.appendChild(opt);
    }
  }, 300);
});

async function handleCompetencyCalc(e) {
  const calcTypeSelect = document.getElementById('calcType');
  if (!calcTypeSelect || calcTypeSelect.value !== 'competency_convert') return;

  // Aturem l'event per evitar que el handler original de app.js el processi
  e.stopImmediatePropagation();
  e.preventDefault();

  const formulaFieldHidden = document.getElementById('formulaFieldHidden');
  const formulaField = document.getElementById('formulaField');
  const currentCalcActivityId = window._currentCalcActivityId || 
    document.querySelector('[data-calc-activity-id]')?.dataset.calcActivityId;

  const formula = formulaFieldHidden?.value || formulaField?.value || '';
  if (!formula.trim()) {
    alert('Construeix primer una fórmula amb les activitats competencials');
    return;
  }

  // Obtenir l'ID de l'activitat actual
  // app.js exposa currentCalcActivityId com a variable local, no global
  // L'obtenim del modal que s'ha obert
  const actId = getCalcActivityId();
  if (!actId) {
    alert('Error: no es pot determinar l\'activitat de destí');
    return;
  }

  try {
    const classStudents = window.classStudents || [];
    if (!_db || classStudents.length === 0) {
      alert('Error: no hi ha alumnes o Firebase no disponible');
      return;
    }

    let processed = 0;
    for (const studentId of classStudents) {
      try {
        const result = await evalFormulaCompetency(formula, studentId);
        if (result === null) continue;

        const label = numericToCompetency(result);
        // Guardem el numèric a notes (per poder refer càlculs)
        // i el label competencial a competencyNotes (per display)
        await _db.collection('alumnes').doc(studentId).update({
          [`notes.${actId}`]: result,
          [`competencyNotes.${actId}`]: label
        });
        processed++;
      } catch (e2) {
        console.error('Error processant alumne:', studentId, e2);
      }
    }

    // Actualitzar display de la fórmula a Firestore
    const displayFormula = formulaField?.value || formula;
    if (window.currentClassId) {
      await _db.collection('classes').doc(window.currentClassId).update({
        [`calculatedActivities.${actId}`]: {
          calculated: true,
          formula: formula,
          displayFormula: displayFormula + ' → ' + numericToCompetency(2.5) + '…'
        }
      });
    }

    // Tancar modal i recarregar
    if (window.closeModal) window.closeModal('modalCalc');
    if (window.loadClassData) setTimeout(() => window.loadClassData(), 300);

    showToastComp(`✅ Càlcul competencial aplicat a ${processed} alumnes`);

  } catch (err) {
    console.error('Error en càlcul competencial:', err);
    alert('Error: ' + err.message);
  }
}

// Obté l'ID de l'activitat que s'està calculant
// app.js guarda currentCalcActivityId com a variable local del mòdul,
// però renderNotesGrid crea el botó amb data-activity-id
function getCalcActivityId() {
  // Intent 1: variable global exposada per app.js (si s'ha exposat)
  if (window.currentCalcActivityId) return window.currentCalcActivityId;

  // Intent 2: cercar a la UI quin botó té la classe activa/modal obert
  const modalCalc = document.getElementById('modalCalc');
  if (!modalCalc || modalCalc.classList.contains('hidden')) return null;

  // Intent 3: últim botó de calculadora que s'ha clicat (ho guardem nosaltres)
  return window._lastCalcActivityId || null;
}

// Interceptar els botons de calculadora per capturar l'activityId
document.addEventListener('click', e => {
  const calcBtn = e.target?.closest('[data-calc-btn]') || 
                  e.target?.closest('button[onclick*="openCalcModal"]');
  if (calcBtn) {
    const actId = calcBtn.dataset.activityId || calcBtn.dataset.calcBtn;
    if (actId) window._lastCalcActivityId = actId;
  }
}, true);

// Interceptar openCalcModal per capturar l'activityId
const origOpenCalcModal = window.openCalcModal;
if (origOpenCalcModal) {
  window.openCalcModal = function(activityId, ...args) {
    window._lastCalcActivityId = activityId;
    window.currentCalcActivityId = activityId;
    return origOpenCalcModal.call(this, activityId, ...args);
  };
}

// Re-interceptar openCalcModal quan estigui disponible
setTimeout(() => {
  if (window.openCalcModal && !window.openCalcModal._compPatched) {
    const orig = window.openCalcModal;
    window.openCalcModal = function(activityId, ...args) {
      window._lastCalcActivityId = activityId;
      window.currentCalcActivityId = activityId;
      return orig.call(this, activityId, ...args);
    };
    window.openCalcModal._compPatched = true;

    // Re-aplicar l'opció al modal
    const calcTypeSelect = document.getElementById('calcType');
    if (calcTypeSelect && !calcTypeSelect.querySelector('option[value="competency_convert"]')) {
      const opt = document.createElement('option');
      opt.value = 'competency_convert';
      opt.textContent = 'Fórmula Competencial (→ NA/AS/AN/AE)';
      calcTypeSelect.appendChild(opt);
    }
  }
}, 2500);

// ============================================================
// AVALUACIÓ DE FÓRMULES COMPETENCIALS (1-4)
// ============================================================
async function evalFormulaCompetency(formula, studentId) {
  try {
    const studentDoc = await _db.collection('alumnes').doc(studentId).get();
    const notes = studentDoc.exists ? studentDoc.data().notes || {} : {};

    let evalStr = formula;

    // Substituir __ACT__id pel valor numèric de l'alumne
    const actMatches = formula.matchAll(/__ACT__([a-zA-Z0-9_]+)/g);
    for (const match of actMatches) {
      const actId = match[1];
      const val = parseFloat(notes[actId]);
      const safeVal = isNaN(val) ? 0 : val;
      evalStr = evalStr.replace(new RegExp(match[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), safeVal);
    }

    const result = Function('"use strict"; return (' + evalStr + ')')();
    return typeof result === 'number' ? Math.round(result * 100) / 100 : null;
  } catch (e) {
    console.error('Error avaluant fórmula competencial:', e);
    return null;
  }
}

// ============================================================
// MOSTRAR BADGE NA/AS/AN/AE A LES CEL·LES CALCULADES
// Quan una activitat competencial té un valor numèric calculat,
// mostrem el badge de color al costat del número
// ============================================================
const badgeObserver = new MutationObserver(() => {
  setTimeout(addBadgesToCalculatedCells, 200);
});

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const notesTbody = document.getElementById('notesTbody');
    if (notesTbody) {
      badgeObserver.observe(notesTbody, { childList: true, subtree: true });
    }
  }, 2000);
});

async function addBadgesToCalculatedCells() {
  if (!_db || !window.currentClassId) return;

  // Obtenir activitats competencials calculades
  try {
    const classDoc = await _db.collection('classes').doc(window.currentClassId).get();
    if (!classDoc.exists) return;
    const calculatedActs = classDoc.data().calculatedActivities || {};

    // Per cada activitat calculada i competencial, afegim badge
    for (const [actId, calcData] of Object.entries(calculatedActs)) {
      if (!calcData.calculated) continue;

      // Comprovar si és competencial
      const actDoc = await _db.collection('activitats').doc(actId).get();
      if (!actDoc.exists || actDoc.data().evaluationType !== 'competency') continue;

      // Trobar les cel·les d'aquesta activitat (inputs numèrics calculats = readonly)
      const inputs = document.querySelectorAll(
        `input[data-activity-id="${actId}"][data-is-competency-numeric="true"], 
         input[data-activity-id="${actId}"][readonly]`
      );

      for (const inp of inputs) {
        const val = parseFloat(inp.value);
        if (isNaN(val)) continue;
        if (inp.nextSibling?.classList?.contains('comp-badge-calc')) continue;

        const badge = document.createElement('span');
        badge.className = 'comp-badge-calc text-xs font-bold px-1.5 py-0.5 rounded ml-1';
        const label = numericToCompetency(val);
        const c = COMP_COLORS[label] || { bg: '#ccc', text: '#000' };
        badge.textContent = label;
        badge.style.backgroundColor = c.bg;
        badge.style.color = c.text;
        inp.parentNode.style.display = 'flex';
        inp.parentNode.style.alignItems = 'center';
        inp.after(badge);
      }
    }
  } catch (e) {
    // silenci - no crític
  }
}

console.log('🎓 competencial-config.js: tots els mòduls inicialitzats');
