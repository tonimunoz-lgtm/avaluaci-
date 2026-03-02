// competencial-config.js
// Injector que millora el sistema competencial:
// 1. Notes numèriques 1-4 (en lloc de selects NA/AS/AN/AE)
// 2. Fórmules entre activitats competencials
// 3. Configuració de trams per professor (guardada a Firestore)
// 4. Conversió automàtica numèric → NA/AS/AN/AE per activitats calculades

console.log('✅ competencial-config.js carregat');

// Declarem que aquest mòdul gestiona les activitats competencials
// competencial.js llegirà aquest flag i no substituirà per selects
window._competencialConfigActive = true;

// ============================================================
// CONFIG PER DEFECTE DELS TRAMS
// ============================================================
const DEFAULT_TRAMS = {
  NA:  { min: 1,   max: 2 },
  AS:  { min: 2,   max: 2.5 },
  AN:  { min: 2.5, max: 3 },
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
  document.getElementById('compConfigModal')?.remove();

  const trams = _trams || DEFAULT_TRAMS;
  const modal = document.createElement('div');
  modal.id = 'compConfigModal';
  modal.className = 'fixed inset-0 flex items-center justify-center z-[9999] bg-black bg-opacity-50';

  modal.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold text-gray-900">⚙️ Configuració Competencial</h2>
        <button id="btnCloseCompConfig" class="text-gray-400 hover:text-gray-700 text-2xl leading-none">✕</button>
      </div>

      <p class="text-sm text-gray-600 mb-4">
        Notes <strong>numèriques de l'1 al 4</strong>. Defineix el rang de cada qualificació.
        Els trams <strong>no poden solapar-se</strong> ni deixar forats.
      </p>

      <div class="space-y-2 mb-4" id="tramsContainer">
        ${['NA','AS','AN','AE'].map(label => `
          <div id="row_${label}" class="flex items-center gap-2 p-3 rounded-lg border-2 transition-all"
               style="border-color:${COMP_COLORS[label].bg}; background:${COMP_COLORS[label].bg}18">
            <span class="inline-block w-10 shrink-0 text-center font-bold text-xs px-2 py-1 rounded"
                  style="background:${COMP_COLORS[label].bg}; color:${COMP_COLORS[label].text}">
              ${label}
            </span>
            <span class="text-sm text-gray-500 shrink-0">De</span>
            <input type="number" id="tram_${label}_min" step="0.01" min="1" max="4"
              value="${trams[label].min}"
              class="tram-input border rounded px-2 py-1 w-20 text-center text-sm focus:ring-2 focus:ring-purple-400"
              data-label="${label}" data-type="min">
            <span class="text-sm text-gray-500 shrink-0">fins a</span>
            <input type="number" id="tram_${label}_max" step="0.01" min="1" max="4"
              value="${trams[label].max}"
              class="tram-input border rounded px-2 py-1 w-20 text-center text-sm focus:ring-2 focus:ring-purple-400"
              data-label="${label}" data-type="max">
            <span id="icon_${label}" class="text-lg shrink-0 w-6 text-center">✅</span>
          </div>
        `).join('')}
      </div>

      <!-- Visualitzador de l'escala -->
      <div class="mb-4">
        <p class="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Previsualització de l'escala 1–4</p>
        <div id="scalePreview" class="h-8 rounded-lg overflow-hidden flex text-xs font-bold"></div>
        <div class="flex justify-between text-xs text-gray-400 mt-1 px-0.5">
          <span>1</span><span>1.5</span><span>2</span><span>2.5</span><span>3</span><span>3.5</span><span>4</span>
        </div>
      </div>

      <!-- Errors -->
      <div id="tramError" class="hidden text-sm bg-red-50 border border-red-200 rounded p-3 mb-3 space-y-1"></div>

      <!-- Botons -->
      <div class="flex gap-2 justify-between items-center">
        <button id="btnResetTrams" class="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded font-medium">
          ↺ Restaurar defecte
        </button>
        <div class="flex gap-2">
          <button id="btnCancelCompConfig" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded font-semibold">
            Cancel·lar
          </button>
          <button id="btnSaveTrams" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
            💾 Guardar
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // ── Validació i preview en temps real ──────────────────────
  function readTrams() {
    const result = {};
    for (const label of ['NA','AS','AN','AE']) {
      result[label] = {
        min: parseFloat(document.getElementById(`tram_${label}_min`).value),
        max: parseFloat(document.getElementById(`tram_${label}_max`).value)
      };
    }
    return result;
  }

  function validateTrams(t) {
    const errors = [];
    const labels = ['NA','AS','AN','AE'];

    // 1) Valors bàsics
    for (const label of labels) {
      const { min, max } = t[label];
      if (isNaN(min) || isNaN(max)) {
        errors.push({ labels: [label], msg: `${label}: cal introduir valors numèrics.` });
        continue;
      }
      if (min < 1 || max > 4) {
        errors.push({ labels: [label], msg: `${label}: els valors han d'estar entre 1 i 4.` });
      }
      if (min > max) {
        errors.push({ labels: [label], msg: `${label}: el valor mínim no pot ser major que el màxim.` });
      }
    }

    if (errors.length) return errors;

    // 2) Solapaments
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i], b = labels[j];
        const ta = t[a], tb = t[b];
        // Solapament si els intervals s'encavalquen (no només toquen)
        if (ta.min < tb.max && tb.min < ta.max) {
          const overlapMin = Math.max(ta.min, tb.min).toFixed(2);
          const overlapMax = Math.min(ta.max, tb.max).toFixed(2);
          errors.push({
            labels: [a, b],
            msg: `⚠️ Solapament entre ${a} i ${b}: el rang ${overlapMin}–${overlapMax} pertany als dos trams alhora.`
          });
        }
      }
    }

    // 3) Forats (valors sense cobertura)
    const allPoints = [...new Set(
      labels.flatMap(l => [t[l].min, t[l].max])
    )].sort((a, b) => a - b);

    for (let k = 0; k < allPoints.length - 1; k++) {
      const mid = (allPoints[k] + allPoints[k + 1]) / 2;
      const covered = labels.some(l => t[l].min <= mid && mid <= t[l].max);
      if (!covered) {
        errors.push({
          labels: [],
          msg: `⚠️ Forat: el valor ${allPoints[k].toFixed(2)}–${allPoints[k+1].toFixed(2)} no queda cobert per cap tram.`
        });
      }
    }

    return errors;
  }

  function updateUI() {
    const t = readTrams();
    const errors = validateTrams(t);
    const errorDiv = document.getElementById('tramError');
    const saveBtn = document.getElementById('btnSaveTrams');

    // Netejar estats visuals
    ['NA','AS','AN','AE'].forEach(label => {
      const row = document.getElementById(`row_${label}`);
      const icon = document.getElementById(`icon_${label}`);
      row.style.borderWidth = '2px';
      row.style.borderStyle = 'solid';
      row.style.borderColor = COMP_COLORS[label].bg;
      icon.textContent = '✅';
    });

    if (errors.length > 0) {
      // Marcar files amb error
      const affectedLabels = new Set(errors.flatMap(e => e.labels));
      affectedLabels.forEach(label => {
        const row = document.getElementById(`row_${label}`);
        const icon = document.getElementById(`icon_${label}`);
        if (row) { row.style.borderColor = '#ef4444'; row.style.borderWidth = '2px'; }
        if (icon) icon.textContent = '❌';
      });

      // Mostrar missatges d'error
      errorDiv.innerHTML = errors.map(e =>
        `<div class="text-red-700">⛔ ${e.msg}</div>`
      ).join('');
      errorDiv.classList.remove('hidden');
      saveBtn.disabled = true;
    } else {
      errorDiv.classList.add('hidden');
      saveBtn.disabled = false;
    }

    // Actualitzar barra de previsualització
    updateScalePreview(t, errors.length === 0);
  }

  function updateScalePreview(t, valid) {
    const preview = document.getElementById('scalePreview');
    if (!preview) return;
    preview.innerHTML = '';

    const SCALE_MIN = 1, SCALE_MAX = 4, SCALE_RANGE = SCALE_MAX - SCALE_MIN;

    if (!valid) {
      preview.style.background = '#fee2e2';
      preview.innerHTML = '<span class="w-full text-center text-red-400 text-xs self-center">⛔ Corregeix els errors per veure la previsualització</span>';
      return;
    }

    // Crear segments ordenats per min
    const segments = ['NA','AS','AN','AE']
      .map(label => ({ label, ...t[label] }))
      .sort((a, b) => a.min - b.min);

    segments.forEach(seg => {
      const widthPct = ((seg.max - seg.min) / SCALE_RANGE) * 100;
      const c = COMP_COLORS[seg.label];
      const div = document.createElement('div');
      div.style.width = `${widthPct}%`;
      div.style.background = c.bg;
      div.style.color = c.text;
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.justifyContent = 'center';
      div.style.fontSize = '11px';
      div.style.fontWeight = 'bold';
      div.style.overflow = 'hidden';
      div.style.whiteSpace = 'nowrap';
      div.textContent = widthPct > 8 ? `${seg.label} (${seg.min}–${seg.max})` : seg.label;
      preview.appendChild(div);
    });
  }

  // Lligar events als inputs
  modal.querySelectorAll('.tram-input').forEach(inp => {
    inp.addEventListener('input', updateUI);
    inp.addEventListener('change', updateUI);
  });

  // Botó reset
  document.getElementById('btnResetTrams').addEventListener('click', () => {
    ['NA','AS','AN','AE'].forEach(label => {
      document.getElementById(`tram_${label}_min`).value = DEFAULT_TRAMS[label].min;
      document.getElementById(`tram_${label}_max`).value = DEFAULT_TRAMS[label].max;
    });
    updateUI();
  });

  // Botó guardar
  document.getElementById('btnSaveTrams').addEventListener('click', async () => {
    const t = readTrams();
    const errors = validateTrams(t);
    if (errors.length > 0) return; // No hauria de passar (botó desactivat)
    await saveTrams(t);
    modal.remove();
    showToastComp('✅ Configuració guardada correctament');
  });

  document.getElementById('btnCloseCompConfig').addEventListener('click', () => modal.remove());
  document.getElementById('btnCancelCompConfig').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  // Pintar estat inicial
  updateUI();
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

// Observem inputs marcats com a competencials per competencial.js
// i els convertim en el nostre wrapper numèric 1-4
const numericObserver = new MutationObserver(() => {
  setTimeout(upgradeCompetencyInputs, 150);
});

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    numericObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-is-competency'] });
  }, 2000);
});

// Converteix inputs amb data-is-competency="true" al nostre format numèric 1-4
async function upgradeCompetencyInputs() {
  // Gestionar tant inputs marcats per competencial.js com selects antics (fallback)
  const targets = [
    ...document.querySelectorAll('input[type="number"][data-is-competency="true"]:not([data-upgraded="true"]):not([data-is-competency-numeric="true"])'),
    ...document.querySelectorAll('select.competency-select:not([data-upgraded="true"])')
  ];

  if (targets.length === 0) return;

  for (const el of targets) {
    el.dataset.upgraded = 'true';
    const activityId = el.dataset.activityId;
    const studentId = el.dataset.studentId || el.closest('tr')?.dataset.studentId;
    if (!activityId || !studentId) continue;

    // Llegir valor numèric actual
    let numericVal = null;
    try {
      const studentDoc = await _db.collection('alumnes').doc(studentId).get();
      const rawVal = studentDoc.exists ? studentDoc.data().notes?.[activityId] : null;
      numericVal = rawVal !== undefined && rawVal !== null ? parseFloat(rawVal) : null;
    } catch (e) { /* no crític */ }

    // Crear wrapper
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
    input.dataset.patched = 'true'; // Evitar que competencial.js el torni a processar
    input.dataset.upgraded = 'true';
    input.placeholder = '1-4';
    if (numericVal !== null && !isNaN(numericVal)) {
      input.value = numericVal;
    }

    // Badge NA/AS/AN/AE
    const badge = document.createElement('span');
    badge.className = 'comp-badge text-xs font-bold px-2 py-0.5 rounded w-full text-center';
    badge.style.minWidth = '44px';
    badge.dataset.compDisplay = 'true';
    badge.dataset.numericVal = numericVal ?? '';

    if (numericVal !== null && !isNaN(numericVal)) {
      applyBadgeStyle(badge, numericToCompetency(numericVal));
    } else {
      badge.textContent = '-';
      badge.style.backgroundColor = '#f3f4f6';
      badge.style.color = '#555';
    }

    input.addEventListener('change', async () => {
      const val = parseFloat(input.value);
      if (isNaN(val) || val < 1 || val > 4) {
        input.value = '';
        badge.textContent = '-';
        badge.style.backgroundColor = '#f3f4f6';
        badge.style.color = '#555';
        badge.dataset.numericVal = '';
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
      try {
        await _db.collection('alumnes').doc(studentId).update({
          [`notes.${activityId}`]: rounded
        });
      } catch (e) { console.error('Error guardant nota competencial:', e); }
    });

    wrapper.appendChild(input);
    wrapper.appendChild(badge);

    try {
  if (!el || !el.parentNode) {
    console.warn('⏭️ Element ja no està al DOM, s’ignora:', el);
    continue;
  }

  el.parentNode.replaceChild(wrapper, el);
} catch (e) {
  console.error('Error substituint element:', e);
}
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
