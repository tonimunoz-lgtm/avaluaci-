// auto-recalc.js — Recalcula fórmules automàticament quan canvia una nota.

console.log('✅ auto-recalc.js carregat');

let _cache = {};
let _debounce = null;
let _pending = false;
let _lastClassId = null;
const DEBOUNCE_MS = 600;

// ── Obtenir classId des del DOM (app.js escriu "ID: xxx" a #classSub) ────
function getClassId() {
  const sub = document.getElementById('classSub');
  if (!sub) return null;
  const text = sub.textContent || '';
  const m = text.match(/ID:\s*(\S+)/);
  return m ? m[1] : null;
}

// ── Obtenir db ────────────────────────────────────────────────
function getDb() {
  return window.db || window.firebase?.firestore?.();
}

// ── Interceptar console.log per detectar canvis de classe ────
// app.js fa: console.log('_classData actualizado:', _classData)
const _origLog = console.log.bind(console);
console.log = function(...args) {
  _origLog(...args);
  if (typeof args[0] === 'string' && args[0].includes('_classData actualizado')) {
    // La classe s'ha recarregat: invalidar cache
    _cache = {};
    _lastClassId = null;
    _origLog('🔄 auto-recalc: cache invalidada per canvi de classe');
  }
};

// ── Escolta GLOBAL de canvis (capture phase, mai es perd) ────
document.addEventListener('change', handleAnyChange, true);

function handleAnyChange(e) {
  const input = e.target;
  if (!input || input.tagName !== 'INPUT') return;
  const activityId = input.dataset.activityId;
  if (!activityId) return;
  if (input.disabled || input.readOnly) return;
  if (!input.closest('#notesTbody')) return;

  _origLog(`📝 auto-recalc: canvi a activitat=${activityId}`);
  clearTimeout(_debounce);
  _debounce = setTimeout(() => scheduleRecalc(activityId), DEBOUNCE_MS);
}

// ── Recàlcul ──────────────────────────────────────────────────
async function scheduleRecalc(changedActId) {
  if (_pending) {
    _debounce = setTimeout(() => scheduleRecalc(changedActId), 300);
    return;
  }

  await ensureCache();
  _origLog('🔍 auto-recalc: cache actual =', JSON.stringify(
    Object.fromEntries(Object.entries(_cache).map(([k,v]) => [k, {formula: v.formula, dependsOn: [...v.dependsOn]}]))
  ));

  const affected = Object.entries(_cache).filter(([, d]) => d.dependsOn.has(changedActId));
  if (affected.length === 0) {
    _origLog(`ℹ️ auto-recalc: cap fórmula depèn de ${changedActId}`);
    return;
  }

  _origLog(`🔄 auto-recalc: recalculant ${affected.length} fórmula(es)...`);
  await doRecalc(affected);
}

async function doRecalc(formulas) {
  _pending = true;
  const db = getDb();
  if (!db) { _pending = false; return; }

  // Obtenir llista d'alumnes de la classe
  const classId = getClassId();
  if (!classId) { _pending = false; return; }

  let students = [];
  try {
    const classDoc = await db.collection('classes').doc(classId).get();
    students = classDoc.exists ? (classDoc.data().alumnes || []) : [];
  } catch(e) { _pending = false; return; }

  if (students.length === 0) { _pending = false; return; }

  showToast();
  try {
    for (const [calcActId, { formula }] of formulas) {
      await Promise.all(students.map(async sid => {
        try {
          const result = await evalFormula(formula, sid, db);
          if (result === null || isNaN(result)) return;
          const rounded = Math.round(result * 100) / 100;
          await db.collection('alumnes').doc(sid).update({ [`notes.${calcActId}`]: rounded });
          flashCell(sid, calcActId, rounded);
        } catch(err) { _origLog('auto-recalc error alumne:', err); }
      }));
      _origLog(`✅ auto-recalc: ${calcActId} recalculat`);
    }
    // Actualitzar mitjanes
    const notesTbody = document.getElementById('notesTbody');
    if (notesTbody) notesTbody.dispatchEvent(new Event('auto-recalc-done'));
  } finally {
    _pending = false;
    hideToast();
  }
}

// ── Cache ─────────────────────────────────────────────────────
async function ensureCache() {
  const classId = getClassId();
  if (!classId) { _origLog('⚠️ auto-recalc: classId no disponible'); return; }

  if (classId === _lastClassId && Object.keys(_cache).length > 0) return;

  _lastClassId = classId;
  _cache = {};

  const db = getDb();
  if (!db) { _origLog('⚠️ auto-recalc: db no disponible'); return; }

  try {
    const classDoc = await db.collection('classes').doc(classId).get();
    if (!classDoc.exists) return;

    const calculatedActs = classDoc.data().calculatedActivities || {};
    _origLog('🔍 auto-recalc: calculatedActs =', JSON.stringify(calculatedActs));

    for (const [actId, data] of Object.entries(calculatedActs)) {
      // Suporta tant {calculated:true, formula:"..."} com el format antic {true} (booleà)
      let formula = null;
      if (typeof data === 'object' && data !== null) {
        formula = data.formula || null;
      }
      if (!formula) {
        _origLog(`⏭️ auto-recalc: [${actId}] sense formula, data=`, JSON.stringify(data));
        continue;
      }

      const dependsOn = new Set();
      for (const m of formula.matchAll(/__ACT__([a-zA-Z0-9_]+)/g)) {
        dependsOn.add(m[1]);
      }

      // Fórmules antigues amb noms d'activitat (sense __ACT__)
      if (dependsOn.size === 0 && formula.length > 0) {
        _origLog(`🔍 auto-recalc: [${actId}] fórmula antiga amb noms: "${formula}"`);
        // Llegir totes les activitats de la classe per fer matching
        const allActIds = new Set([
          ...(classDoc.data().activitats || []),
          ...Object.values(classDoc.data().terms || {}).flatMap(t => t.activities || [])
        ]);
        for (const aid of allActIds) {
          try {
            const adoc = await db.collection('activitats').doc(aid).get();
            if (!adoc.exists) continue;
            const nom = adoc.data().nom || '';
            if (nom && formula.includes(nom)) {
              dependsOn.add(aid);
              _origLog(`   → depèn de [${aid}] nom="${nom}"`);
            }
          } catch(_) {}
        }
      }

      if (dependsOn.size > 0) {
        _cache[actId] = { formula, dependsOn };
        _origLog(`✅ auto-recalc: cache[${actId}] formula="${formula}" depèn de`, [...dependsOn]);
      } else {
        _origLog(`⚠️ auto-recalc: [${actId}] no s'han trobat dependències per formula="${formula}"`);
      }
    }
  } catch(e) {
    _origLog('auto-recalc: error ensureCache:', e);
  }
}

// ── Avaluació ─────────────────────────────────────────────────
async function evalFormula(formula, studentId, db) {
  try {
    const sdoc = await db.collection('alumnes').doc(studentId).get();
    const notes = sdoc.exists ? (sdoc.data().notes || {}) : {};
    let expr = formula;
    for (const m of [...formula.matchAll(/__ACT__([a-zA-Z0-9_]+)/g)]) {
      const val = Number(notes[m[1]]);
      expr = expr.replace(new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), isNaN(val) ? 0 : val);
    }
    const result = Function('"use strict"; return (' + expr + ')')();
    return typeof result === 'number' ? result : null;
  } catch(e) { return null; }
}

// ── DOM update ────────────────────────────────────────────────
function flashCell(studentId, activityId, value) {
  const tr = document.querySelector(`tr[data-student-id="${studentId}"]`);
  if (!tr) return;
  const input = tr.querySelector(`input[data-activity-id="${activityId}"]`);
  if (!input) return;
  input.value = value;
  input.style.transition = 'background-color 0.4s';
  input.style.backgroundColor = '#bbf7d0';
  setTimeout(() => {
    input.style.backgroundColor = '';
    if (typeof window.applyCellColor === 'function') window.applyCellColor(input);
  }, 1000);
}

// ── Toast ─────────────────────────────────────────────────────
function showToast() {
  let t = document.getElementById('autoRecalcToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'autoRecalcToast';
    t.style.cssText = 'position:fixed;bottom:1rem;left:1rem;background:#2563eb;color:#fff;font-size:12px;padding:6px 12px;border-radius:8px;z-index:99999;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(0,0,0,.2)';
    t.innerHTML = '<span style="animation:spin 1s linear infinite;display:inline-block">⟳</span> Actualitzant fórmules...';
    document.body.appendChild(t);
    if (!document.getElementById('arSpinStyle')) {
      const s = document.createElement('style');
      s.id = 'arSpinStyle';
      s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(s);
    }
  }
  t.style.opacity = '1';
}
function hideToast() {
  const t = document.getElementById('autoRecalcToast');
  if (t) { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }
}

// ── API pública ───────────────────────────────────────────────
window.autoRecalc = {
  invalidateCache: () => { _cache = {}; _lastClassId = null; },
  getCache: () => _cache,
  getClassId
};

console.log('🔄 auto-recalc.js: llest');
