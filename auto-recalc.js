// auto-recalc.js
// Injector que recalcula automàticament les activitats amb fórmula
// quan es modifica una nota que en forma part.
// No modifica cap fitxer existent.

console.log('✅ auto-recalc.js carregat');

// ── Estat intern ──────────────────────────────────────────────
let _recalcPending = false;       // evita recàlculs en cascada
let _debounceTimer = null;        // agrupa canvis ràpids
const DEBOUNCE_MS = 800;          // espera 800ms després de l'últim canvi

// Mapa cache: activityId → formula (es refresca quan canvia la classe)
let _formulaCache = {};           // { calcActId: formulaText }
let _lastClassId = null;

// ── Inicialització ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(init, 2000);
});

function init() {
  // Escolta canvis a la taula de notes usant event delegation
  // (funciona fins i tot quan els inputs es recreen per renderNotesGrid)
  const notesTbody = document.getElementById('notesTbody');
  if (!notesTbody) {
    setTimeout(init, 500);
    return;
  }

  // Event delegation: captura 'change' de qualsevol input dins notesTbody
  notesTbody.addEventListener('change', handleNoteChange);

  // També observem quan es recrea notesTbody (renderNotesGrid el buida i el refà)
  // per refrescar la cache de fórmules
  const observer = new MutationObserver(() => {
    refreshFormulaCache();
  });
  observer.observe(notesTbody, { childList: true });

  // Carreguem la cache inicial
  refreshFormulaCache();

  console.log('✅ auto-recalc.js: event delegation actiu sobre notesTbody');
}

// ── Cache de fórmules ──────────────────────────────────────────
// Llegeix calculatedActivities de Firestore i construeix un mapa
// activityId_calculada → { formula, dependsOn: Set<activityId> }
async function refreshFormulaCache() {
  const classId = window.currentClassId;
  if (!classId) return;

  // Només recarreguem si ha canviat la classe
  if (classId === _lastClassId && Object.keys(_formulaCache).length > 0) return;
  _lastClassId = classId;

  try {
    const db = window.firebase?.firestore?.();
    if (!db) return;

    const classDoc = await db.collection('classes').doc(classId).get();
    if (!classDoc.exists) return;

    const calculatedActs = classDoc.data().calculatedActivities || {};
    const newCache = {};

    for (const [calcActId, calcData] of Object.entries(calculatedActs)) {
      if (!calcData.calculated || !calcData.formula) continue;

      const formula = calcData.formula;

      // Extreure IDs d'activitats referenciades per la fórmula (__ACT__id)
      const dependsOn = new Set();
      const matches = formula.matchAll(/__ACT__([a-zA-Z0-9_]+)/g);
      for (const m of matches) {
        dependsOn.add(m[1]);
      }

      // Fallback: fórmules antigues que usen noms d'activitat (no __ACT__)
      // Les detectem comparant amb les activitats existents
      // Però per no fer massa queries, les gestionem al moment del canvi

      newCache[calcActId] = { formula, dependsOn };
    }

    _formulaCache = newCache;
    console.log(`🔄 auto-recalc: cache actualitzada, ${Object.keys(newCache).length} fórmules`);
  } catch (e) {
    console.error('auto-recalc: error refrescant cache:', e);
  }
}

// ── Gestió del canvi de nota ───────────────────────────────────
function handleNoteChange(e) {
  const input = e.target;

  // Ignorar inputs de fórmules calculades (readOnly/disabled)
  if (input.disabled || input.readOnly) return;
  if (!input.dataset.activityId) return;
  // Ignorar inputs competencials gestionats per competencial-config.js
  if (input.dataset.isCompetencyNumeric === 'true') return;

  const changedActivityId = input.dataset.activityId;
  const studentId = input.closest('tr')?.dataset.studentId;
  if (!studentId) return;

  console.log(`📝 Nota canviada: activitat=${changedActivityId}, alumne=${studentId}`);

  // Debounce: esperar que l'usuari acabi d'escriure
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    triggerRecalc(changedActivityId, studentId);
  }, DEBOUNCE_MS);
}

// ── Recalcul ──────────────────────────────────────────────────
async function triggerRecalc(changedActivityId, studentId) {
  if (_recalcPending) return;

  // Trobar quines activitats calculades depenen de l'activitat canviada
  const affectedFormulas = Object.entries(_formulaCache).filter(([, data]) =>
    data.dependsOn.has(changedActivityId)
  );

  if (affectedFormulas.length === 0) {
    // Pot ser una fórmula antiga amb noms. Refresca cache i torna a provar.
    await refreshFormulaCache();
    const retry = Object.entries(_formulaCache).filter(([, data]) =>
      data.dependsOn.has(changedActivityId)
    );
    if (retry.length === 0) return;
    return triggerRecalcFormulas(retry, studentId);
  }

  await triggerRecalcFormulas(affectedFormulas, studentId);
}

async function triggerRecalcFormulas(formulas, changedStudentId) {
  _recalcPending = true;

  try {
    const db = window.firebase?.firestore?.();
    if (!db) return;

    const classStudents = window.classStudents || [];
    const classId = window.currentClassId;
    if (!classId || classStudents.length === 0) return;

    // Mostrar indicador visual
    showRecalcIndicator(formulas.map(([id]) => id));

    for (const [calcActId, { formula }] of formulas) {
      console.log(`🔄 Recalculant fórmula per activitat ${calcActId}...`);

      // Recalcular TOTS els alumnes (no només el que ha canviat)
      // perquè pot haver-hi fórmules que depenen de mitjanes de grup, etc.
      // En la majoria de casos és per alumne individual, però per seguretat ho fem tot.
      await Promise.all(classStudents.map(async (sid) => {
        try {
          const result = await evalFormula(formula, sid, db);
          if (result === null || isNaN(result)) return;

          const rounded = Math.round(result * 100) / 100;

          // Guardar a Firestore
          await db.collection('alumnes').doc(sid).update({
            [`notes.${calcActId}`]: rounded
          });

          // Actualitzar la cel·la al DOM directament (sense re-render complet)
          updateCellInDOM(sid, calcActId, rounded);

        } catch (err) {
          console.error(`Error recalculant alumne ${sid}:`, err);
        }
      }));

      console.log(`✅ Fórmula ${calcActId} recalculada`);
    }

    // Actualitzar mitjanes de la fila de totals
    if (window.renderAverages) {
      window.renderAverages();
    } else {
      // Fallback: buscar i cridar renderAverages si existeix
      requestAnimationFrame(() => {
        document.dispatchEvent(new CustomEvent('auto-recalc-done'));
      });
    }

  } catch (e) {
    console.error('auto-recalc: error en recàlcul:', e);
  } finally {
    _recalcPending = false;
    hideRecalcIndicator();
  }
}

// ── Avaluació de fórmules ─────────────────────────────────────
// Replica la lògica de evalFormulaAsync d'app.js però sense dependre d'ella
async function evalFormula(formula, studentId, db) {
  try {
    const studentDoc = await db.collection('alumnes').doc(studentId).get();
    const notes = studentDoc.exists ? studentDoc.data().notes || {} : {};

    let evalStr = formula;

    // Substituir __ACT__id per valors numèrics
    const idMatches = [...formula.matchAll(/__ACT__([a-zA-Z0-9_]+)/g)];
    for (const m of idMatches) {
      const actId = m[1];
      const val = Number(notes[actId]);
      const safeVal = isNaN(val) ? 0 : val;
      evalStr = evalStr.replace(
        new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        safeVal
      );
    }

    // Substituir noms d'activitat (fórmules antigues sense __ACT__)
    // Busquem al _formulaCache si hi ha noms literals
    if (idMatches.length === 0) {
      // Obtenir tots els noms d'activitats de la classe
      const classId = window.currentClassId;
      const classDoc = await db.collection('classes').doc(classId).get();
      const allActIds = new Set();
      const terms = classDoc.data()?.terms || {};
      Object.values(terms).forEach(t => (t.activities || []).forEach(id => allActIds.add(id)));
      (classDoc.data()?.activitats || []).forEach(id => allActIds.add(id));

      for (const actId of allActIds) {
        const actDoc = await db.collection('activitats').doc(actId).get();
        if (!actDoc.exists) continue;
        const actName = actDoc.data().nom;
        if (!actName) continue;
        const val = Number(notes[actId]);
        const safeVal = isNaN(val) ? 0 : val;
        evalStr = evalStr.replace(
          new RegExp(actName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          safeVal
        );
      }
    }

    const result = Function('"use strict"; return (' + evalStr + ')')();
    return typeof result === 'number' ? result : null;
  } catch (e) {
    console.error('auto-recalc: error avaluant fórmula:', e);
    return null;
  }
}

// ── Actualitzar DOM sense re-render complet ───────────────────
function updateCellInDOM(studentId, activityId, value) {
  const tr = document.querySelector(`tr[data-student-id="${studentId}"]`);
  if (!tr) return;

  const input = tr.querySelector(`input[data-activity-id="${activityId}"]`);
  if (!input) return;

  // Actualitzar valor
  input.value = value;

  // Ressaltar breument per mostrar que s'ha actualitzat
  input.style.transition = 'background-color 0.3s ease';
  input.style.backgroundColor = '#bbf7d0'; // verd clar
  setTimeout(() => {
    input.style.backgroundColor = '';
    // Reaplicar color d'app.js si existeix
    if (window.applyCellColor) {
      window.applyCellColor(input);
    }
  }, 1200);
}

// ── Indicador visual de recàlcul ──────────────────────────────
function showRecalcIndicator(calcActIds) {
  calcActIds.forEach(actId => {
    // Marcar la capçalera de la columna
    const th = document.querySelector(`th[data-activity-id="${actId}"]`);
    if (th) {
      th.dataset.recalculating = 'true';
      th.style.opacity = '0.6';
    }

    // Marcar totes les cel·les de la columna
    document.querySelectorAll(`input[data-activity-id="${actId}"]`).forEach(inp => {
      inp.style.opacity = '0.5';
    });
  });

  // Toast discret
  let toast = document.getElementById('autoRecalcToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'autoRecalcToast';
    toast.className = 'fixed bottom-4 left-4 bg-blue-600 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-[99999] flex items-center gap-2 transition-opacity';
    toast.innerHTML = '<span class="animate-spin">⟳</span> Actualitzant fórmules...';
    document.body.appendChild(toast);
  }
  toast.style.opacity = '1';
}

function hideRecalcIndicator() {
  // Treure marcadors de capçaleres
  document.querySelectorAll('th[data-recalculating="true"]').forEach(th => {
    th.style.opacity = '';
    delete th.dataset.recalculating;
  });

  // Treure opacitat de cel·les
  Object.keys(_formulaCache).forEach(actId => {
    document.querySelectorAll(`input[data-activity-id="${actId}"]`).forEach(inp => {
      inp.style.opacity = '';
    });
  });

  // Amagar toast
  const toast = document.getElementById('autoRecalcToast');
  if (toast) {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }
}

// ── Refrescar cache quan es recarrega la classe ────────────────
// Interceptem quan _classData s'actualitza (app.js ho fa a la línia 639)
// Usem un proxy sobre window.currentClassId o escoltem l'event de Firestore
const classChangeObserver = new MutationObserver(() => {
  const classId = window.currentClassId;
  if (classId && classId !== _lastClassId) {
    _formulaCache = {};
    _lastClassId = null;
    setTimeout(refreshFormulaCache, 500);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    // Observem la capçalera de la taula: quan es recrea, vol dir que s'ha fet renderNotesGrid
    const notesThead = document.getElementById('notesThead');
    if (notesThead) {
      classChangeObserver.observe(notesThead, { childList: true, subtree: true });
    }
  }, 2000);
});

// ── Exposar per a ús extern ───────────────────────────────────
window.autoRecalc = {
  refreshCache: refreshFormulaCache,
  forceRecalcAll: async () => {
    _formulaCache = {};
    await refreshFormulaCache();
    const all = Object.entries(_formulaCache);
    if (all.length > 0) await triggerRecalcFormulas(all, null);
  }
};

console.log('🔄 auto-recalc.js: inicialitzat correctament');
