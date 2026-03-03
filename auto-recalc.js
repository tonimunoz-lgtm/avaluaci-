// auto-recalc.js
// Recalcula automàticament columnes amb fórmula quan canvia una nota.

console.log('✅ auto-recalc.js carregat');

// ── Estat ─────────────────────────────────────────────────────
let _cache = {};          // { calcActId: { formula, dependsOn: Set } }
let _debounce = null;
let _pending = false;
let _lastClassId = null;

const DEBOUNCE_MS = 600;

// ── Escolta GLOBAL sobre document (no es perd mai amb re-renders) ──
document.addEventListener('change', handleAnyChange, true); // capture phase

function handleAnyChange(e) {
  const input = e.target;
  if (!input || input.tagName !== 'INPUT') return;

  const activityId = input.dataset.activityId;
  if (!activityId) return;

  // Ignorar inputs desactivats (calculats/bloquejats)
  if (input.disabled || input.readOnly) return;

  // Ha de ser dins de notesTbody
  if (!input.closest('#notesTbody')) return;

  console.log(`📝 auto-recalc: canvi detectat a activitat=${activityId}`);

  clearTimeout(_debounce);
  _debounce = setTimeout(() => scheduleRecalc(activityId), DEBOUNCE_MS);
}

// ── Recàlcul ─────────────────────────────────────────────────
async function scheduleRecalc(changedActId) {
  if (_pending) {
    _debounce = setTimeout(() => scheduleRecalc(changedActId), 300);
    return;
  }

  await ensureCache();

  const affected = Object.entries(_cache).filter(([, d]) => d.dependsOn.has(changedActId));

  if (affected.length === 0) {
    console.log(`ℹ️ auto-recalc: cap fórmula depèn de ${changedActId}`);
    return;
  }

  console.log(`🔄 auto-recalc: recalculant ${affected.length} fórmula(es)...`);
  await doRecalc(affected);
}

async function doRecalc(formulas) {
  _pending = true;
  const db = window.firebase?.firestore?.();
  if (!db) { _pending = false; return; }

  const students = window.classStudents || [];
  if (students.length === 0) { _pending = false; return; }

  showToast();

  try {
    for (const [calcActId, { formula }] of formulas) {
      await Promise.all(students.map(async sid => {
        try {
          const result = await evalFormula(formula, sid, db);
          if (result === null || isNaN(result)) return;
          const rounded = Math.round(result * 100) / 100;
          await db.collection('alumnes').doc(sid).update({
            [`notes.${calcActId}`]: rounded
          });
          flashCell(sid, calcActId, rounded);
        } catch (err) {
          console.error(`auto-recalc: error alumne ${sid}:`, err);
        }
      }));
      console.log(`✅ auto-recalc: fórmula ${calcActId} actualitzada`);
    }

    if (typeof window.renderAverages === 'function') window.renderAverages();

  } finally {
    _pending = false;
    hideToast();
  }
}

// ── Cache de fórmules ─────────────────────────────────────────
async function ensureCache() {
  const classId = window.currentClassId;
  if (!classId) return;

  if (classId !== _lastClassId) {
    _cache = {};
    _lastClassId = classId;
  }
  if (Object.keys(_cache).length > 0) return;

  try {
    const db = window.firebase?.firestore?.();
    if (!db) return;

    const classDoc = await db.collection('classes').doc(classId).get();
    if (!classDoc.exists) return;

    const calculatedActs = classDoc.data().calculatedActivities || {};
    console.log('🔍 calculatedActs complet:', JSON.stringify(calculatedActs));
    const newCache = {};

    for (const [actId, data] of Object.entries(calculatedActs)) {
      console.log(`🔍 entrada [${actId}]:`, JSON.stringify(data));
      if (!data.calculated || !data.formula) {
        console.log(`⏭️ saltat [${actId}]: calculated=${data.calculated}, formula=${data.formula}`);
        continue;
      }

      const formula = data.formula;
      const dependsOn = new Set();

      for (const m of formula.matchAll(/__ACT__([a-zA-Z0-9_]+)/g)) {
        dependsOn.add(m[1]);
      }

      // Fórmules antigues amb noms d'activitat
      if (dependsOn.size === 0) {
        const acts = window.classActivities || [];
        for (const aid of acts) {
          try {
            const adoc = await db.collection('activitats').doc(aid).get();
            if (!adoc.exists) continue;
            const nom = adoc.data().nom || '';
            if (nom && formula.includes(nom)) dependsOn.add(aid);
          } catch (_) {}
        }
      }

      if (dependsOn.size > 0) {
        newCache[actId] = { formula, dependsOn };
      }
    }

    _cache = newCache;
    console.log(`🗂️ auto-recalc: cache OK — ${Object.keys(_cache).length} fórmules`);
    console.log('🗂️ cache detall:', JSON.stringify(
      Object.fromEntries(Object.entries(_cache).map(([k, v]) => [k, { formula: v.formula, dependsOn: [...v.dependsOn] }]))
    ));
    console.log('🗂️ calculatedActs raw:', JSON.stringify(calculatedActs));
  } catch (e) {
    console.error('auto-recalc: error cache:', e);
  }
}

// Invalidar cache quan es re-renderitza la capçalera (nova fórmula aplicada, etc.)
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const thead = document.getElementById('notesThead');
    if (thead) {
      new MutationObserver(() => { _cache = {}; }).observe(thead, { childList: true });
    }
  }, 1500);
});

// ── Avaluació de fórmules ─────────────────────────────────────
async function evalFormula(formula, studentId, db) {
  try {
    const sdoc = await db.collection('alumnes').doc(studentId).get();
    const notes = sdoc.exists ? (sdoc.data().notes || {}) : {};

    let expr = formula;

    for (const m of [...formula.matchAll(/__ACT__([a-zA-Z0-9_]+)/g)]) {
      const val = Number(notes[m[1]]);
      expr = expr.replace(
        new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        isNaN(val) ? 0 : val
      );
    }

    const result = Function('"use strict"; return (' + expr + ')')();
    return typeof result === 'number' ? result : null;
  } catch (e) {
    console.error('auto-recalc evalFormula:', e);
    return null;
  }
}

// ── Actualitzar cel·la al DOM ────────────────────────────────
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

// ── Toast ────────────────────────────────────────────────────
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
  invalidateCache: () => { _cache = {}; },
  forceRecalcAll: async () => {
    _cache = {};
    await ensureCache();
    if (Object.keys(_cache).length > 0) await doRecalc(Object.entries(_cache));
  }
};

console.log('🔄 auto-recalc.js: llest');
