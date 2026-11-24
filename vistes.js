// vistes.js — navegació lateral, pestanyes de classe (Notes / Comentaris / Resum),
// pantalles Alumnes, Informes i Configuració, i notificacions (campana).
// Només LLEGEIX de Firestore (no escriu res). Depèn d'app.js via window.AvaluApp.
const esc = window.esc || (s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
const db = () => firebase.firestore();
const $ = (id) => document.getElementById(id);
const PASS = 5;

/* ------------------------------------------------------------------ dades */
const num = v => { const n = Number(v); return v === '' || v == null || isNaN(n) ? null : n; };
const fmt = v => v == null ? '–' : (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const _th = () => window.AvaluConfig?.get().th || { red: 5, yellow: 7, green: 9 };
const toneOf = v => { const t = _th(); return v == null ? 'none' : v < t.red ? 'red' : v < t.yellow ? 'yellow' : v < t.green ? 'lgreen' : 'green'; };
const hue = name => { let h = 0; for (const c of String(name || '')) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const initials = n => (String(n || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('') || '?').toUpperCase();

let _cache = null; // { at, classes: [...] }

// Carrega totes les classes del professor amb activitats i alumnes (cau 60 s)
async function loadAll(force) {
  if (!force && _cache && Date.now() - _cache.at < 60000) return _cache.classes;
  const uid = firebase.auth().currentUser?.uid;
  if (!uid) return [];
  const prof = await db().collection('professors').doc(uid).get();
  const ids = prof.exists ? (prof.data().classes || []) : [];
  const classes = (await Promise.all(ids.map(id => db().collection('classes').doc(id).get())))
    .filter(d => d.exists).map(d => ({ id: d.id, ...d.data() }));
  await Promise.all(classes.map(async c => {
    const terms = c.terms || {};
    const actIds = [...new Set(Object.values(terms).flatMap(t => t.activities || []))];
    const [acts, studs] = await Promise.all([
      Promise.all(actIds.map(id => db().collection('activitats').doc(id).get())),
      Promise.all((c.alumnes || []).map(id => db().collection('alumnes').doc(id).get()))
    ]);
    c.actNames = {}; c.actComp = {};
    acts.forEach(a => {
      c.actNames[a.id] = a.exists ? (a.data().nom || 'Sense nom') : 'Desconeguda';
      const d = a.exists ? a.data() : {};
      c.actComp[a.id] = d.evaluationType === 'competency' || d.isCompetency === true;
    });
    c.students = studs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() }));
  }));
  _cache = { at: Date.now(), classes };
  return classes;
}
const invalidate = () => { _cache = null; };

// Comentari d'un alumne en un grup d'avaluació (camp nou comentarisTrim; el camp antic
// comentarios[classe] compta com a comentari del primer grup)
function commentOf(s, c, termId) {
  const trim = (s.comentarisTrim || {})[c.id] || {};
  const legacy = String((s.comentarios || {})[c.id] || '');
  const first = Object.keys(c.terms || {})[0];
  const v = typeof trim[termId] === 'string' ? trim[termId] : (legacy && (!first || termId === first) ? legacy : '');
  return String(v).trim();
}
// Grups on té sentit demanar comentari: els que tenen activitats (o tots si cap en té)
function commentTerms(c, termId) {
  const ids = Object.keys(c.terms || {});
  if (!ids.length) return [null];
  if (termId) return [termId];
  const withActs = ids.filter(id => (c.terms[id].activities || []).length);
  return withActs.length ? withActs : ids;
}

// Període «actual» d'una classe: el que l'usuari ha triat per última vegada a la graella; si no n'hi ha,
// l'últim període que ja té alguna nota (sense comptar activitats calculades); si no, l'últim.
function currentTermOf(c) {
  const ids = Object.keys(c.terms || {});
  if (!ids.length) return '';
  let r = null; try { r = localStorage.getItem(`avaluapp.term.${c.id}`); } catch {}
  if (r && c.terms[r]) return r;
  const calc = c.calculatedActivities || {};
  const hasGrades = id => (c.terms[id].activities || []).some(a => !calc[a]?.calculated && (c.students || []).some(s => num((s.notes || {})[a]) != null));
  return [...ids].reverse().find(hasGrades) || ids[ids.length - 1];
}
const termName = (c, id) => (c.terms?.[id]?.name || c.terms?.[id]?.nom || '');

// Estadístiques d'una classe (opcionalment per a un sol grup d'avaluació)
function analyse(c, termId) {
  const terms = c.terms || {};
  // Les activitats calculades (fórmula, mitjana ponderada, arrodoniment) són només el resultat d'altres
  // activitats: no compten als informes ni a «Alumnes a vigilar» (comptarien les notes dues vegades).
  const calc = c.calculatedActivities || {};
  const actIds = (termId && terms[termId] ? (terms[termId].activities || [])
    : [...new Set(Object.values(terms).flatMap(t => t.activities || []))]).filter(a => !calc[a]?.calculated);
  const rows = (c.students || []).map(s => {
    const vals = actIds.map(a => num((s.notes || {})[a]));
    const done = vals.filter(v => v != null);
    return {
      id: s.id, nom: s.nom || '?', email: s.email || '',
      avg: avg(done), failed: done.filter(v => v < PASS).length,
      missing: actIds.length - done.length, vals,
      comment: termId || !Object.keys(terms).length ? commentOf(s, c, termId || null) : ''
    };
  });
  const cmTerms = commentTerms(c, termId);
  const cmTotal = rows.length * cmTerms.length;
  const cmDone = (c.students || []).reduce((n, s) => n + cmTerms.filter(t => commentOf(s, c, t)).length, 0);
  const acts = actIds.map((a, i) => {
    const v = rows.map(r => r.vals[i]).filter(x => x != null);
    return {
      id: a, nom: c.actNames?.[a] || a, n: v.length, avg: avg(v),
      pass: v.length ? v.filter(x => x >= PASS).length / v.length : null,
      max: v.length ? Math.max(...v) : null, min: v.length ? Math.min(...v) : null,
      missing: rows.length - v.length
    };
  });
  const withAvg = rows.filter(r => r.avg != null);
  const bins = Array(10).fill(0);
  withAvg.forEach(r => { bins[Math.min(9, Math.floor(r.avg))]++; });
  const sorted = withAvg.map(r => r.avg).sort((a, b) => a - b);
  const median = sorted.length ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2) : null;
  const mean = avg(sorted);
  const sd = sorted.length ? Math.sqrt(avg(sorted.map(x => (x - mean) ** 2))) : null;
  return {
    rows, acts, bins, mean, median, sd,
    passN: withAvg.filter(r => r.avg >= PASS).length,
    failN: withAvg.filter(r => r.avg < PASS).length,
    noGrades: rows.length - withAvg.length,
    risk: rows.filter(r => r.avg != null && (r.avg < PASS || r.failed >= 2)),
    top: [...withAvg].sort((a, b) => b.avg - a.avg).slice(0, 5),
    commented: cmDone, cmTotal
  };
}

/* ------------------------------------------------------------- component UI */
const kpi = (label, value, sub, cls = '') => `<div class="kpi ${cls}"><small>${esc(label)}</small><b>${value}</b>${sub ? `<em>${sub}</em>` : ''}</div>`;
const pct = (n, t) => t ? Math.round(n * 100 / t) + ' %' : '–';

function histogram(bins) {
  const max = Math.max(1, ...bins);
  const tone = i => i < _th().red ? 'red' : i < _th().yellow ? 'yellow' : i < _th().green ? 'lgreen' : 'green';
  return `<div class="histo">${bins.map((n, i) => `
    <div class="histo-col"><span class="histo-n">${n || ''}</span>
      <div class="histo-bar t-${tone(i)}" style="height:${Math.max(n ? 6 : 2, n / max * 100)}%"></div>
      <span class="histo-l">${i}${i === 9 ? '–10' : ''}</span></div>`).join('')}</div>`;
}

function reportHTML(c, termId) {
  const a = analyse(c, termId);
  const graded = a.passN + a.failN;
  return `
  <div class="kpis">
    ${kpi('Alumnes', a.rows.length, `${a.noGrades} sense notes`)}
    ${kpi('Mitjana de la classe', fmt(a.mean), `mediana ${fmt(a.median)} · σ ${fmt(a.sd)}`, 'tone-' + toneOf(a.mean))}
    ${kpi('Aprovats', pct(a.passN, graded), `${a.passN} alumnes`, 'tone-green')}
    ${kpi('Suspesos', pct(a.failN, graded), `${a.failN} alumnes`, a.failN ? 'tone-red' : '')}
    ${kpi('Comentaris fets', pct(a.commented, a.cmTotal), `${a.cmTotal - a.commented} pendents`)}
  </div>

  <div class="rep-grid">
    <div class="panel"><h3>Distribució de mitjanes</h3><p class="muted">Nombre d'alumnes per franja de mitjana</p>${histogram(a.bins)}</div>
    <div class="panel"><h3>Aprovats / suspesos</h3>
      <div class="donut-wrap">
        <div class="donut" style="--p:${graded ? a.passN / graded * 100 : 0}"><span>${pct(a.passN, graded)}</span></div>
        <ul class="donut-legend"><li><i class="t-green"></i>Aprovats: ${a.passN}</li><li><i class="t-red"></i>Suspesos: ${a.failN}</li><li><i class="t-none"></i>Sense notes: ${a.noGrades}</li></ul>
      </div>
    </div>
  </div>

  <div class="panel"><h3>Resultats per activitat</h3>
    ${a.acts.length ? `<div class="tbl-wrap"><table class="rep-table"><thead><tr><th>Activitat</th><th>Mitjana</th><th>Aprovats</th><th>Màx.</th><th>Mín.</th><th>Sense nota</th></tr></thead><tbody>
      ${a.acts.map(x => `<tr><td class="l">${esc(x.nom)}</td>
        <td><span class="pill t-${toneOf(x.avg)}">${fmt(x.avg)}</span></td>
        <td><div class="bar"><i style="width:${(x.pass ?? 0) * 100}%"></i></div><small>${x.pass == null ? '–' : Math.round(x.pass * 100) + ' %'}</small></td>
        <td>${fmt(x.max)}</td><td>${fmt(x.min)}</td><td>${x.missing}</td></tr>`).join('')}
    </tbody></table></div>` : '<p class="muted">Aquesta classe encara no té activitats.</p>'}
  </div>

  <div class="rep-grid">
    <div class="panel"><h3>⚠️ Alumnes en risc</h3><p class="muted">Mitjana inferior a 5 o dues o més activitats suspeses</p>
      ${a.risk.length ? `<ul class="people">${a.risk.sort((x, y) => x.avg - y.avg).map(r => `
        <li class="fx-link" data-fx-stu="${esc(r.id)}" data-fx-cls="${esc(c.id)}" role="button" tabindex="0"><span class="stu-avatar" style="--hue:${hue(r.nom)}">${esc(initials(r.nom))}</span><b>${esc(r.nom)}</b>
        <small>${r.failed} susp. · ${r.missing} sense nota</small><span class="pill t-${toneOf(r.avg)}">${fmt(r.avg)}</span></li>`).join('')}</ul>` : '<p class="muted">Cap alumne en risc. 🎉</p>'}
    </div>
    <div class="panel"><h3>🏆 Millors resultats</h3><p class="muted">Els 5 alumnes amb millor mitjana</p>
      ${a.top.length ? `<ul class="people">${a.top.map(r => `
        <li><span class="stu-avatar" style="--hue:${hue(r.nom)}">${esc(initials(r.nom))}</span><b>${esc(r.nom)}</b><span class="pill t-${toneOf(r.avg)}">${fmt(r.avg)}</span></li>`).join('')}</ul>` : '<p class="muted">Encara no hi ha notes.</p>'}
    </div>
  </div>`;
}

function csvOf(c, termId) {
  const a = analyse(c, termId);
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const head = ['Alumne', ...a.acts.map(x => x.nom), 'Mitjana', 'Suspeses', 'Sense nota', 'Comentari'];
  const lines = [head.map(q).join(';')];
  a.rows.forEach(r => lines.push([r.nom, ...r.vals.map(v => v == null ? '' : String(v).replace('.', ',')), r.avg == null ? '' : fmt(r.avg), r.failed, r.missing, r.comment].map(q).join(';')));
  return '﻿' + lines.join('\r\n');
}
function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------- navegació */
const SCREENS = ['screen-classes', 'screen-class', 'screen-alumne', 'screen-alumnes', 'screen-informes', 'screen-historial', 'screen-config'];
function setActiveNav(btn) {
  document.querySelectorAll('.sidebar .nav-item').forEach(b => b.classList.toggle('active', b === btn));
}
function showOnly(id) {
  SCREENS.forEach(s => $(s)?.classList.toggle('hidden', s !== id));
}

$('navHome').addEventListener('click', () => {
  setActiveNav($('navHome'));
  ['screen-alumne', 'screen-alumnes', 'screen-informes', 'screen-historial', 'screen-config'].forEach(s => $(s).classList.add('hidden'));
  invalidate();
});
$('navStudents').addEventListener('click', () => { setActiveNav($('navStudents')); showOnly('screen-alumnes'); renderAlumnes(); });
$('navReports').addEventListener('click', () => { setActiveNav($('navReports')); showOnly('screen-informes'); renderInformes(); });
$('navHistory').addEventListener('click', () => { setActiveNav($('navHistory')); showOnly('screen-historial'); window.Historial?.renderScreen($('screen-historial')); });
$('navSettings').addEventListener('click', () => { setActiveNav($('navSettings')); showOnly('screen-config'); renderConfig(); });

/* ------------------------------------------------------------ pantalla Alumnes */
async function renderAlumnes() {
  const root = $('screen-alumnes');
  root.innerHTML = '<h2 class="section-title">Alumnes</h2><p class="muted" style="margin-top:1rem">Carregant…</p>';
  const classes = await loadAll();
  const all = classes.flatMap(c => analyse(c).rows.map(r => ({ ...r, classId: c.id, classe: c.nom || 'Sense nom' })));
  root.innerHTML = `
    <div class="classes-head"><h2 class="section-title">Alumnes <small class="muted">(${all.length})</small></h2>
      <div class="search-box"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg><input id="allStuSearch" type="search" placeholder="Cercar alumne en totes les classes..."></div></div>
    <div class="panel"><div class="tbl-wrap"><table class="rep-table" id="allStuTable"><thead><tr><th class="l">Alumne</th><th class="l">Classe</th><th>Mitjana</th><th>Susp.</th><th>Sense nota</th><th class="l">Email</th></tr></thead>
    <tbody>${all.sort((a, b) => a.nom.localeCompare(b.nom, 'ca')).map(r => `
      <tr data-class="${esc(r.classId)}" data-stu="${esc(r.id)}" data-q="${esc((r.nom + ' ' + r.classe).toLowerCase())}" style="cursor:pointer">
        <td class="l"><span class="stu-avatar" style="--hue:${hue(r.nom)}">${esc(initials(r.nom))}</span> <b>${esc(r.nom)}</b></td>
        <td class="l">${esc(r.classe)}</td><td><span class="pill t-${toneOf(r.avg)}">${fmt(r.avg)}</span></td>
        <td>${r.failed}</td><td>${r.missing}</td><td class="l muted">${esc(r.email) || '—'}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Encara no hi ha alumnes.</td></tr>'}</tbody></table></div></div>`;
  $('allStuSearch').addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    root.querySelectorAll('tbody tr[data-q]').forEach(tr => { tr.style.display = tr.dataset.q.includes(q) ? '' : 'none'; });
  });
  root.querySelector('tbody').addEventListener('click', e => {
    const tr = e.target.closest('tr[data-class]');
    if (!tr) return;
    openFitxa(tr.dataset.class, tr.dataset.stu, 'alumnes');
  });
}

/* ------------------------------------------------------------ pantalla Informes */
let _repSel = { cls: '', term: null }; // term: null = període actual de la classe; '' = tots
async function renderInformes() {
  const root = $('screen-informes');
  root.innerHTML = '<h2 class="section-title">Informes</h2><p class="muted" style="margin-top:1rem">Carregant…</p>';
  const classes = await loadAll();
  if (!classes.length) { root.innerHTML = '<h2 class="section-title">Informes</h2><div class="panel" style="margin-top:1rem">Crea una classe per veure\'n els informes.</div>'; return; }
  if (!classes.some(c => c.id === _repSel.cls) && _repSel.cls !== 'ALL') _repSel = { cls: classes[0].id, term: null };
  const cur = classes.find(c => c.id === _repSel.cls);
  const termOpts = cur ? Object.entries(cur.terms || {}) : [];
  const termSel = cur ? (_repSel.term === null ? currentTermOf(cur) : _repSel.term) : '';
  root.innerHTML = `
    <div class="classes-head"><h2 class="section-title">Informes</h2>
      <div class="toolbar">
        <select id="repClass" class="pill-select">${classes.map(c => `<option value="${esc(c.id)}" ${c.id === _repSel.cls ? 'selected' : ''}>${esc(c.nom || 'Sense nom')}</option>`).join('')}<option value="ALL" ${_repSel.cls === 'ALL' ? 'selected' : ''}>Totes les classes (comparativa)</option></select>
        ${cur ? `<select id="repTerm" class="pill-select"><option value="">Tots els períodes</option>${termOpts.map(([id, t]) => `<option value="${esc(id)}" ${id === termSel ? 'selected' : ''} translate="no">${esc(t.name || t.nom || id)}</option>`).join('')}</select>
        <button id="repCsv" type="button"><svg viewBox="0 0 24 24"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>Exportar CSV</button>` : ''}
        <button id="repPrint" type="button"><svg viewBox="0 0 24 24"><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/></svg>Imprimir</button>
      </div></div>
    <div id="repBody">${cur ? reportHTML(cur, termSel) : compareHTML(classes)}</div>`;
  $('repClass').addEventListener('change', e => { _repSel = { cls: e.target.value, term: null }; renderInformes(); });
  $('repTerm')?.addEventListener('change', e => { _repSel.term = e.target.value; renderInformes(); });
  $('repCsv')?.addEventListener('click', () => download(`informe-${(cur.nom || 'classe').replace(/\W+/g, '_')}.csv`, csvOf(cur, termSel)));
  $('repPrint').addEventListener('click', () => window.print());
  $('repBody').addEventListener('click', e => {
    const li = e.target.closest('[data-fx-stu]');
    if (li) openFitxa(li.dataset.fxCls, li.dataset.fxStu, 'informes');
  });
}

function compareHTML(classes) {
  const rows = classes.map(c => ({ c, a: analyse(c, currentTermOf(c)) }));
  const max = 10;
  return `<div class="panel"><h3>Comparativa entre classes</h3><p class="muted">Mitjana de les mitjanes dels alumnes i percentatge d'aprovats, del període actual de cada classe</p>
  <div class="tbl-wrap"><table class="rep-table"><thead><tr><th class="l">Classe</th><th>Alumnes</th><th>Mitjana</th><th class="l" style="min-width:160px"></th><th>Aprovats</th><th>Suspesos</th><th>En risc</th></tr></thead><tbody>
  ${rows.map(({ c, a }) => `<tr><td class="l"><b>${esc(c.nom || 'Sense nom')}</b></td><td>${a.rows.length}</td>
    <td><span class="pill t-${toneOf(a.mean)}">${fmt(a.mean)}</span></td>
    <td class="l"><div class="bar wide"><i class="t-${toneOf(a.mean)}" style="width:${(a.mean ?? 0) / max * 100}%"></i></div></td>
    <td>${pct(a.passN, a.passN + a.failN)}</td><td>${a.failN}</td><td>${a.risk.length}</td></tr>`).join('')}
  </tbody></table></div></div>`;
}

/* ------------------------------------------------------------ Configuració */
function renderConfig() {
  if (window.AvaluConfig?.render) window.AvaluConfig.render($('screen-config'));
}

/* ------------------------------------------------------------ pestanyes de classe */
let _tab = 'notes';
function switchTab(tab) {
  _tab = tab;
  document.querySelectorAll('.tabs .tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $('classScreenWrapper').classList.toggle('hidden', tab !== 'notes');
  $('tab-comentaris').classList.toggle('hidden', tab !== 'comentaris');
  $('tab-resum').classList.toggle('hidden', tab !== 'resum');
  document.querySelector('.sub-actions')?.classList.toggle('tab-off', tab !== 'notes');
  if (tab === 'comentaris') renderComentaris();
  if (tab === 'resum') renderResum();
}
document.querySelector('.tabs').addEventListener('click', e => {
  const b = e.target.closest('.tab'); if (b) switchTab(b.dataset.tab);
});
window.addEventListener('class-opened', e => { _resTerm = null; invalidate(); switchTab(e.detail?.tab || 'notes'); });
// Quan es redibuixa la graella (nota, comentari…) refresquem la pestanya activa
window.addEventListener('grid-rendered', () => {
  invalidate(); fillActFilter();
  if (_tab !== 'notes') switchTab(_tab);
});

async function currentClass() {
  const id = window.AvaluApp?.getClassId?.();
  if (!id) return null;
  return (await loadAll(true)).find(c => c.id === id) || null;
}

let _cmTerm = null;
const termSelect = (c, id, sel, withAll) => {
  const ts = Object.entries(c.terms || {});
  if (!ts.length) return '';
  return `<select id="${id}" class="pill-select">${withAll ? `<option value="">Tots els períodes</option>` : ''}${ts.map(([k, t]) => `<option value="${esc(k)}" ${k === sel ? 'selected' : ''} translate="no">${esc(t.name || k)}</option>`).join('')}</select>`;
};

async function renderComentaris() {
  const root = $('tab-comentaris');
  root.innerHTML = '<p class="muted" style="padding:1rem">Carregant…</p>';
  const c = await currentClass();
  if (!c) { root.innerHTML = ''; return; }
  const ids = Object.keys(c.terms || {});
  if (!_cmTerm || !ids.includes(_cmTerm)) _cmTerm = window.AvaluApp?.getActiveTermId?.() || ids[0] || null;
  const a = analyse(c, _cmTerm);
  const done = a.rows.filter(r => r.comment).length;
  root.innerHTML = `
    <div class="panel">
      <div class="classes-head" style="margin-bottom:.8rem"><h3>Comentaris dels alumnes <small class="muted">(${done}/${a.rows.length})</small></h3>
        <div class="toolbar">${termSelect(c, 'cmTermSel', _cmTerm, false)}
        <label class="chk"><input type="checkbox" id="onlyPending"> Només pendents</label></div></div>
      <ul class="comments-list">${a.rows.map(r => `
        <li data-id="${esc(r.id)}" data-pending="${r.comment ? 0 : 1}">
          <span class="stu-avatar" style="--hue:${hue(r.nom)}">${esc(initials(r.nom))}</span>
          <div class="cm-body"><b>${esc(r.nom)}</b>
            <p class="${r.comment ? '' : 'muted'}">${r.comment ? esc(r.comment) : 'Sense comentari'}</p></div>
          <button type="button" class="btn cm-edit" data-id="${esc(r.id)}" data-name="${esc(r.nom)}">${r.comment ? 'Editar' : 'Afegir'}</button>
        </li>`).join('') || '<li class="muted">No hi ha alumnes.</li>'}</ul>
    </div>`;
  const comments = Object.fromEntries(a.rows.map(r => [r.id, r.comment]));
  $('cmTermSel')?.addEventListener('change', e => { _cmTerm = e.target.value; renderComentaris(); });
  root.querySelector('#onlyPending').addEventListener('change', e => {
    root.querySelectorAll('.comments-list li[data-id]').forEach(li => { li.style.display = e.target.checked && li.dataset.pending === '0' ? 'none' : ''; });
  });
  root.querySelector('.comments-list').addEventListener('click', e => {
    const b = e.target.closest('.cm-edit'); if (!b) return;
    window.openCommentsModal?.(b.dataset.id, b.dataset.name, comments[b.dataset.id] || '', _cmTerm);
  });
}

let _resTerm = null; // null = període actiu de la graella; '' = tots
async function renderResum() {
  const root = $('tab-resum');
  root.innerHTML = '<p class="muted" style="padding:1rem">Carregant…</p>';
  const c = await currentClass();
  if (!c) { root.innerHTML = ''; return; }
  if (_resTerm === null) _resTerm = window.AvaluApp?.getActiveTermId?.() || '';
  root.innerHTML = `<div class="toolbar" style="margin-top:.8rem">${termSelect(c, 'resTermSel', _resTerm, true)}</div>` + reportHTML(c, _resTerm);
  $('resTermSel')?.addEventListener('change', e => { _resTerm = e.target.value; renderResum(); });
}

/* ------------------------------------------------------------ filtre d'activitat */
function fillActFilter() {
  const sel = $('actFilter'); if (!sel) return;
  const ths = [...document.querySelectorAll('#notesThead th')];
  const prev = sel.value;
  sel.innerHTML = '<option value="">Totes les activitats</option>' +
    ths.slice(1, -1).map((t, i) => `<option value="${i + 1}">${esc((t.querySelector('span:not(.lock-icon)')?.textContent || t.textContent).trim())}</option>`).join('');
  sel.value = [...sel.options].some(o => o.value === prev) ? prev : '';
  applyActFilter();
}
function applyActFilter() {
  const v = $('actFilter')?.value || '';
  const last = document.querySelectorAll('#notesThead th').length - 1;
  document.querySelectorAll('#notesTable tr').forEach(tr => {
    [...tr.children].forEach((cell, i) => {
      cell.style.display = (v && i !== 0 && i !== last && String(i) !== v) ? 'none' : '';
    });
  });
}
$('actFilter')?.addEventListener('change', applyActFilter);

/* ------------------------------------------------------------ notificacions */
const bell = $('btnBell'), bellMenu = $('bellMenu');
// En mòbil la campaneta passa a la capçalera fixa (menú de dalt), al costat del botó de sortir
(function () {
  const mq = window.matchMedia('(max-width: 860px)');
  const wrap = document.querySelector('.bell-wrap'), side = document.querySelector('.sidebar'), out = $('btnLogoutIcon');
  const right = document.querySelector('.topbar-right'), ua = $('userArea');
  if (!wrap || !side || !right) return;
  const place = () => {
    if (mq.matches) side.insertBefore(wrap, out || null);
    else right.insertBefore(wrap, ua || null);
    bellMenu.classList.add('hidden');
  };
  place();
  (mq.addEventListener ? mq.addEventListener('change', place) : mq.addListener(place));
})();
bell.addEventListener('click', e => {
  e.stopPropagation();
  bellMenu.classList.toggle('hidden');
  // En mòbil el desplegable va a pantalla completa en amplada (si no, queda tallat per l'esquerra)
  bellMenu.style.top = (!bellMenu.classList.contains('hidden') && window.innerWidth <= 860)
    ? (bell.getBoundingClientRect().bottom + 8) + 'px' : '';
});
document.addEventListener('click', () => bellMenu.classList.add('hidden'));
window.addEventListener('pending-comments', e => {
  const { total, byClass, noTutoria } = e.detail;
  $('bellDot').classList.toggle('hidden', !total || window.AvaluConfig?.get().avisos === false);
  bellMenu.innerHTML = total
    ? `<div class="bell-title">Comentaris pendents</div>` + byClass.filter(x => x.pending).map(x =>
        `<button type="button" data-id="${esc(x.id)}"><b>${esc(x.nom)}</b><small>${x.pending} alumne${x.pending === 1 ? '' : 's'} sense comentari</small></button>`).join('')
    : noTutoria ? '<div class="bell-title">Comentaris</div><p class="muted" style="padding:.3rem .8rem .6rem">Tria la teva classe de tutoria a Configuració per veure els comentaris pendents.</p>'
    : '<div class="bell-title">Tot al dia 🎉</div><p class="muted" style="padding:.3rem .8rem .6rem">No tens comentaris pendents.</p>';
});
bellMenu.addEventListener('click', e => {
  const b = e.target.closest('button[data-id]'); if (!b) return;
  bellMenu.classList.add('hidden');
  setActiveNav($('navHome'));
  ['screen-alumne', 'screen-alumnes', 'screen-informes', 'screen-historial', 'screen-config'].forEach(s => $(s).classList.add('hidden'));
  window.AvaluApp?.openClass?.(b.dataset.id, 'comentaris');
});

/* ------------------------------------------------------------ indicacions en passar el ratolí (tooltips) */
// Tot botó o icona rep un «title» perquè en passar-hi el ratolí s'expliqui què fa.
// Si l'element ja en té, no es toca; si només té aria-label, es copia; i per als principals hi ha un text propi.
const TIPS = {
  navHome: 'Inici: les teves classes', navStudents: 'Alumnes', navReports: 'Informes', navSettings: 'Configuració',
  btnBell: 'Comentaris pendents', userMenuBtn: "Menú d'usuari", btnLogoutIcon: 'Tanca la sessió',
  viewCards: 'Mostra les classes en targetes', viewList: 'Mostra les classes en llista', viewDDBtn: 'Canvia la vista de les classes',
  btnCreateClass: 'Crea una classe nova', btnDeleteMode: 'Selecciona classes per eliminar',
  btnClassroomImport: 'Importa classes i activitats de Google Classroom',
  btnClassFilter: 'Ordena i filtra les classes', btnBack: 'Torna a totes les classes',
  btnSortAlpha: 'Ordena els alumnes per nom o cognom', btnStudentsMenu: 'Afegir, importar o eliminar alumnes',
  btnAddTerm: 'Afegeix un període nou', termMenuBtn: 'Opcions del període', termsDropdown: "Canvia de període d'avaluació",
  actFilter: 'Mostra només una activitat', gridStudentSearch: 'Cerca un alumne per nom',
  classSearch: 'Cerca una classe pel nom', stuHeadMenuBtn: 'Opcions dels alumnes',
  btnExportClass: 'Exporta les notes de la classe', btnPrintClass: 'Imprimeix la graella de notes',
  btnAddActivity: 'Afegeix una activitat a la graella', btnTutoria: 'Crea un comentari de butlletí amb IA',
  repCsv: "Descarrega l'informe en CSV", repPrint: "Imprimeix l'informe"
};
const TIPS_BY_CLASS = [
  ['.stu-menu-btn', "Opcions de l'alumne"], ['.menu-btn.opt-btn', "Opcions de l'activitat"], ['.menu-btn', 'Opcions'],
  ['.tab', null]
];
function autoTitle(root) {
  const els = root.querySelectorAll ? root.querySelectorAll('button, [role="button"], select, input[type="search"], input[type="text"], .legend, [aria-label]') : [];
  const list = root.matches && root.matches('button, [aria-label]') ? [root, ...els] : els;
  list.forEach(el => {
    if (el.title || el.closest('[translate="no"]')) return;
    let tip = TIPS[el.id];
    if (!tip) for (const [sel, t] of TIPS_BY_CLASS) { if (t && el.matches(sel)) { tip = t; break; } }
    if (!tip) tip = el.getAttribute('aria-label');
    if (tip) el.title = tip;
  });
}
let _tipT = 0;
new MutationObserver(() => { cancelAnimationFrame(_tipT); _tipT = requestAnimationFrame(() => autoTitle(document.body)); })
  .observe(document.body, { childList: true, subtree: true });
autoTitle(document.body);

/* ------------------------------------------------------------ Fase 5: alumnes a vigilar (pantalla d'inici) */
// Targeta amb els alumnes amb mitjana < 5 o 2 o més activitats suspeses (mateix criteri que Informes).
// Reutilitza la memòria cau de loadAll (60 s) i només es calcula mentre es veu la pantalla d'inici.
let _riskAt = 0, _riskBusy = false;
const riskOpenKey = 'avaluapp.riskOpen';
async function renderRiskCard() {
  const home = $('screen-classes');
  if (!home || home.classList.contains('hidden') || _riskBusy) return;
  const on = window.AvaluConfig?.get().avisRisc !== false;
  let card = $('riskCard');
  if (!on) { card?.remove(); return; }
  _riskBusy = true;
  try {
    const classes = await loadAll();
    _riskAt = Date.now();
    const groups = classes.map(c => {
      const a = analyse(c, currentTermOf(c));
      return { c, risk: a.risk.sort((x, y) => x.avg - y.avg), graded: a.rows.length - a.noGrades };
    }).filter(g => g.risk.length);
    const total = groups.reduce((n, g) => n + g.risk.length, 0);
    const anyGrades = classes.some(c => { const a = analyse(c, currentTermOf(c)); return a.rows.length - a.noGrades > 0; });
    if (!anyGrades) { card?.remove(); return; }
    if (!card) {
      card = document.createElement('div'); card.id = 'riskCard';
      home.insertBefore(card, home.querySelector('.classes-head'));
      card.addEventListener('click', e => {
        if (e.target.closest('.rk-head')) {
          const open = !card.classList.contains('open'); card.classList.toggle('open', open);
          try { localStorage.setItem(riskOpenKey, open ? '1' : '0'); } catch {}
          return;
        }
        const r = e.target.closest('[data-stu]');
        if (r) openFitxa(r.dataset.cls, r.dataset.stu, 'home');
      });
    }
    let open = false; try { open = localStorage.getItem(riskOpenKey) === '1'; } catch {}
    card.className = 'risk-card' + (total ? ' warn' : ' ok') + (open ? ' open' : '');
    card.innerHTML = total ? `
      <button type="button" class="rk-head" aria-expanded="${open}">
        <span class="rk-ic">⚠️</span>
        <span class="rk-t"><b translate="no">${total}</b> <span>${total === 1 ? 'alumne a vigilar' : 'alumnes a vigilar'}</span>
          <small>període actual de cada classe · mitjana inferior a 5 o 2 o més suspeses</small></span>
        <svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button>
      <div class="rk-body">${groups.map(g => `<div class="rk-class" translate="no">${esc(g.c.nom || 'Sense nom')}${termName(g.c, currentTermOf(g.c)) ? ' · ' + esc(termName(g.c, currentTermOf(g.c))) : ''}</div>` +
        g.risk.map(r => `<div class="rk-row" role="button" tabindex="0" data-stu="${esc(r.id)}" data-cls="${esc(g.c.id)}">
          <span class="stu-avatar" style="--hue:${hue(r.nom)}" translate="no">${esc(initials(r.nom))}</span>
          <span class="rk-n" translate="no">${esc(r.nom)}</span>
          <small>${r.failed} susp. · ${r.missing} sense nota</small>
          <span class="pill t-${toneOf(r.avg)}" translate="no">${fmt(r.avg)}</span></div>`).join('')).join('')}</div>`
      : `<div class="rk-head static"><span class="rk-ic">✅</span><span class="rk-t"><span>Cap alumne a vigilar</span></span></div>`;
  } catch (e) { console.warn('Targeta d\'alumnes a vigilar:', e); }
  finally { _riskBusy = false; }
}
window.addEventListener('class-opened', () => { _riskAt = 0; });
window.addEventListener('avalu-config', () => { _riskAt = 0; renderRiskCard(); });
setInterval(() => {
  if (!firebase.auth().currentUser) return;
  const home = $('screen-classes');
  if (home && !home.classList.contains('hidden') && Date.now() - _riskAt > 60000) renderRiskCard();
}, 2500);

/* ------------------------------------------------------------ Fitxa de l'alumne (evolució) */
// Pantalla pròpia d'un alumne: mitjana, tendència, gràfic activitat a activitat (o matèria a matèria a la
// classe de tutoria) comparat amb la classe, taula per període i avisos calculats amb regles simples (sense IA).
// Només llegeix (usa loadAll). Les activitats competencials (0–4) es porten a 0–10 només per comparar.
let _fx = { cls: '', stu: '', term: null, from: 'alumnes' };
// Classe de tutoria / seguiment: les columnes són matèries, no activitats en el temps. Per defecte es detecta pel nom
// de la classe («tutor…») i l'usuari ho pot canviar (es recorda per classe, només en aquest navegador).
function fxSubjectMode(c) {
  let v = null; try { v = localStorage.getItem('avaluapp.fx.mat.' + c.id); } catch {}
  if (v === '1') return true; if (v === '0') return false;
  return /tutor|seguiment/i.test(c.nom || '');
}

const fxScale = (c, a) => c.actComp?.[a] ? 2.5 : 1;
const fxVal = (c, s, a) => { const v = num((s.notes || {})[a]); return v == null ? null : v * fxScale(c, a); };
const fxCalc = c => c.calculatedActivities || {};
function fxActs(c, termId) {
  const t = c.terms || {};
  const ids = termId && t[termId] ? (t[termId].activities || []) : Object.values(t).flatMap(x => x.activities || []);
  return [...new Set(ids)].filter(a => !fxCalc(c)[a]?.calculated);
}
function fxClassAvg(c, a) { return avg((c.students || []).map(s => fxVal(c, s, a)).filter(v => v != null)); }

function fxAnalyse(c, s, termId, subj) {
  const acts = fxActs(c, termId).map(id => ({
    id, nom: c.actNames?.[id] || id, v: fxVal(c, s, id), cls: fxClassAvg(c, id),
    n: (c.students || []).filter(x => fxVal(c, x, id) != null).length
  }));
  const done = acts.filter(a => a.v != null);
  const vals = done.map(a => a.v);
  const mean = avg(vals);
  const classMean = avg(acts.map(a => a.cls).filter(v => v != null));
  const failed = done.filter(a => a.v < PASS).length;
  const missing = acts.filter(a => a.v == null && a.n >= Math.max(1, (c.students || []).length / 2));
  // tendència: mitjana de la segona meitat de la sèrie menys la de la primera (mínim 3 notes)
  let trend = null;
  if (!subj && vals.length >= 3) { const h = Math.floor(vals.length / 2); trend = avg(vals.slice(vals.length - h)) - avg(vals.slice(0, h)); }
  // períodes
  const terms = Object.entries(c.terms || {}).map(([id, t]) => {
    const as = fxActs(c, id);
    const mine = as.map(a => fxVal(c, s, a)).filter(v => v != null);
    const cl = as.map(a => fxClassAvg(c, a)).filter(v => v != null);
    return { id, nom: t.name || t.nom || id, avg: avg(mine), cls: avg(cl), n: mine.length, total: as.length };
  });
  const tWith = terms.filter(t => t.avg != null);
  if (subj && tWith.length >= 2) trend = tWith[tWith.length - 1].avg - tWith[tWith.length - 2].avg;
  const alerts = [];
  const last3 = vals.slice(-3);
  if (!subj && last3.length === 3 && last3[0] > last3[1] && last3[1] > last3[2] && last3[0] - last3[2] >= 1)
    alerts.push({ k: 'down', txt: `Ha baixat a les ${last3.length} últimes notes seguides (de ${fmt(last3[0])} a ${fmt(last3[2])}).` });
  if (!termId && tWith.length >= 2) {
    const a = tWith[tWith.length - 1], b = tWith[tWith.length - 2];
    if (b.avg - a.avg >= 1) alerts.push({ k: 'down', txt: `La mitjana ha baixat de ${fmt(b.avg)} a ${fmt(a.avg)} entre «${b.nom}» i «${a.nom}».` });
    else if (a.avg - b.avg >= 1) alerts.push({ k: 'up', txt: `La mitjana ha pujat de ${fmt(b.avg)} a ${fmt(a.avg)} entre «${b.nom}» i «${a.nom}».` });
  }
  if (failed >= 2) alerts.push({ k: 'fail', txt: `Té ${failed} ${failed === 1 ? 'nota suspesa' : 'notes suspeses'} (${done.filter(a => a.v < PASS).slice(0, 4).map(a => a.nom).join(', ')}${failed > 4 ? '…' : ''}).` });
  else if (failed === 1) alerts.push({ k: 'fail', txt: `Ha suspès ${done.find(a => a.v < PASS).nom} (${fmt(done.find(a => a.v < PASS).v)}).` });
  if (missing.length) alerts.push({ k: 'miss', txt: `Sense nota a ${missing.length === 1 ? '' : missing.length + ' activitats: '}${missing.slice(0, 4).map(a => a.nom).join(', ')}${missing.length > 4 ? '…' : ''}, i la majoria de la classe sí en té.` });
  const far = done.filter(a => a.cls != null && a.cls - a.v >= 2 && a.n >= 3).sort((x, y) => (y.cls - y.v) - (x.cls - x.v));
  if (far.length) alerts.push({ k: 'gap', txt: `Molt per sota de la classe a ${far.slice(0, 2).map(a => `${a.nom} (${fmt(a.v)} davant de ${fmt(a.cls)})`).join(' i ')}.` });
  const risky = alerts.some(a => ['down', 'fail', 'gap'].includes(a.k) && !(a.k === 'fail' && failed < 2)) || (mean != null && mean < PASS) || failed >= 2;
  const improving = alerts.some(a => a.k === 'up') || (trend != null && trend >= 1 && !risky);
  const status = mean == null ? 'none' : risky ? 'warn' : improving ? 'up' : 'ok';
  // matèries × períodes (mode tutoria): mateix nom de matèria a cada període
  let matrix = [];
  if (subj) {
    const byName = new Map();
    Object.entries(c.terms || {}).forEach(([tid, t]) => fxActs(c, tid).forEach(a => {
      const k = (c.actNames?.[a] || a).trim().toLowerCase();
      const r = byName.get(k) || { nom: c.actNames?.[a] || a, per: {} };
      r.per[tid] = { v: fxVal(c, s, a), cls: fxClassAvg(c, a) }; byName.set(k, r);
    }));
    matrix = [...byName.values()];
  }
  return { acts, done, mean, classMean, failed, missing, trend, terms, alerts, status, matrix };
}

function fxChart(acts) {
  if (acts.length < 2) return '<p class="muted">Calen almenys dues activitats per dibuixar el gràfic.</p>';
  const W = 640, H = 230, L = 34, R = 12, T = 12, B = acts.length > 4 ? 62 : 34;
  const PAD = 60, x = i => L + PAD + (W - L - R - 2 * PAD) * (acts.length === 1 ? .5 : i / (acts.length - 1));
  const y = v => T + (H - T - B) * (1 - Math.max(0, Math.min(10, v)) / 10);
  const path = key => { let d = '', pen = false; acts.forEach((a, i) => { const v = a[key]; if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `; pen = true; }); return d; };
  const grid = [0, 2, 4, 6, 8, 10].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#e8e4fa"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#6b6f8d">${v}</text>`).join('');
  const rot = acts.length > 4;
  const labels = acts.map((a, i) => { const t = a.nom.length > 18 ? a.nom.slice(0, 17) + '…' : a.nom; return `<text translate="no" x="${x(i)}" y="${H - B + 16}" font-size="11" fill="#6b6f8d" text-anchor="${rot ? 'end' : 'middle'}" ${rot ? `transform="rotate(-35 ${x(i)} ${H - B + 16})"` : ''}>${esc(t)}</text>`; }).join('');
  const pts = acts.map((a, i) => a.v == null ? '' : `<circle cx="${x(i)}" cy="${y(a.v)}" r="5" fill="${a.v < PASS ? '#e11d48' : '#4f2fe0'}"><title translate="no">${esc(a.nom)}: ${fmt(a.v)}${a.cls != null ? ' (classe ' + fmt(a.cls) + ')' : ''}</title></circle>`).join('');
  return `<svg class="fx-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolució de les notes de l'alumne comparada amb la mitjana de la classe">
    ${grid}<line x1="${L}" x2="${W - R}" y1="${y(PASS)}" y2="${y(PASS)}" stroke="#e11d48" stroke-dasharray="2 4" stroke-width="1.2"/>
    <path d="${path('cls')}" fill="none" stroke="#8d8aa8" stroke-width="2" stroke-dasharray="6 4"/>
    <path d="${path('v')}" fill="none" stroke="#4f2fe0" stroke-width="2.5" stroke-linejoin="round"/>${pts}${labels}</svg>
    <div class="fx-legend"><span><i style="background:#4f2fe0"></i>Alumne</span><span><i class="dash"></i>Mitjana de la classe</span><span><i class="dot"></i>Aprovat (5)</span></div>`;
}

function fxBars(acts) {
  if (!acts.length) return '<p class="muted">Encara no hi ha matèries.</p>';
  const W = 640, H = 240, L = 34, R = 12, T = 12, B = 56;
  const slot = (W - L - R) / acts.length, bw = Math.min(34, slot * .5);
  const y = v => T + (H - T - B) * (1 - Math.max(0, Math.min(10, v)) / 10);
  const cx = i => L + slot * (i + .5);
  const grid = [0, 2, 4, 6, 8, 10].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#e8e4fa"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#6b6f8d">${v}</text>`).join('');
  const bars = acts.map((a, i) => (a.v == null ? '' : `<rect x="${cx(i) - bw / 2}" y="${y(a.v)}" width="${bw}" height="${y(0) - y(a.v)}" rx="4" fill="${a.v < PASS ? '#e11d48' : '#4f2fe0'}"><title translate="no">${esc(a.nom)}: ${fmt(a.v)}${a.cls != null ? ' (classe ' + fmt(a.cls) + ')' : ''}</title></rect>`) +
    (a.cls == null ? '' : `<line x1="${cx(i) - bw / 2 - 5}" x2="${cx(i) + bw / 2 + 5}" y1="${y(a.cls)}" y2="${y(a.cls)}" stroke="#8d8aa8" stroke-width="3" stroke-linecap="round"/>`)).join('');
  const labels = acts.map((a, i) => { const t = a.nom.length > 14 ? a.nom.slice(0, 13) + '…' : a.nom; return `<text translate="no" x="${cx(i)}" y="${H - B + 16}" font-size="11" fill="#6b6f8d" text-anchor="end" transform="rotate(-35 ${cx(i)} ${H - B + 16})">${esc(t)}</text>`; }).join('');
  return `<svg class="fx-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Nota de l'alumne en cada matèria comparada amb la mitjana de la classe">${grid}<line x1="${L}" x2="${W - R}" y1="${y(PASS)}" y2="${y(PASS)}" stroke="#e11d48" stroke-dasharray="2 4" stroke-width="1.2"/>${bars}${labels}</svg>
    <div class="fx-legend"><span><i style="background:#4f2fe0"></i>Alumne</span><span><i style="background:#8d8aa8;height:3px"></i>Mitjana de la classe</span><span><i class="dot"></i>Aprovat (5)</span></div>`;
}

const FX_ICON = { down: '↘', up: '↗', fail: '✕', miss: '○', gap: '≠' };
const FX_STATUS = { warn: ['A vigilar', 'warn'], up: ['En millora', 'up'], ok: ['Estable', 'ok'], none: ['Sense notes', 'none'] };

async function openFitxa(classId, stuId, from) {
  _fx = { cls: classId, stu: stuId, term: null, from: from || _fx.from };
  setActiveNav($('navStudents'));
  showOnly('screen-alumne');
  await renderFitxa();
}

async function renderFitxa() {
  const root = $('screen-alumne');
  if (!root) return;
  root.innerHTML = '<p class="muted" style="margin-top:1rem">Carregant…</p>';
  const classes = await loadAll();
  const c = classes.find(x => x.id === _fx.cls);
  const s = c?.students.find(x => x.id === _fx.stu);
  if (!c || !s) { root.innerHTML = '<div class="panel">No s\'ha trobat l\'alumne.</div>'; return; }
  const termSel = _fx.term === null ? currentTermOf(c) : _fx.term;
  const subj = fxSubjectMode(c);
  const a = fxAnalyse(c, s, termSel, subj);
  const [stLabel, stCls] = FX_STATUS[a.status];
  const termOpts = Object.entries(c.terms || {});
  const delta = a.mean != null && a.classMean != null ? a.mean - a.classMean : null;
  const sg = v => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v));
  root.innerHTML = `
    <div class="fx-top"><button type="button" id="fxBack" class="fx-back">← Tornar</button></div>
    <div class="panel fx-head">
      <span class="stu-avatar fx-av" style="--hue:${hue(s.nom)}" translate="no">${esc(initials(s.nom))}</span>
      <div class="fx-id"><h2 translate="no">${esc(s.nom || '?')}</h2><p class="muted" translate="no">${esc(c.nom || 'Sense nom')}</p></div>
      <span class="fx-chip fx-${stCls}">${stLabel}</span>
      <label class="fx-mode muted"><input type="checkbox" id="fxSubj" ${subj ? 'checked' : ''}> Les columnes són matèries</label>
      <select id="fxTerm" class="pill-select"><option value="">Tots els períodes</option>${termOpts.map(([id, t]) => `<option value="${esc(id)}" ${id === termSel ? 'selected' : ''} translate="no">${esc(t.name || t.nom || id)}</option>`).join('')}</select>
    </div>
    <div class="kpis">
      ${kpi('Mitjana', fmt(a.mean), a.classMean != null ? `classe ${fmt(a.classMean)}${delta != null ? ' · ' + sg(delta) : ''}` : '', 'tone-' + toneOf(a.mean))}
      ${kpi('Tendència', a.trend == null ? '–' : (a.trend >= 0.5 ? '↗ ' : a.trend <= -0.5 ? '↘ ' : '→ ') + sg(a.trend), subj ? 'darrer període → anterior' : 'primera meitat → segona meitat', a.trend != null && a.trend <= -1 ? 'tone-red' : a.trend != null && a.trend >= 1 ? 'tone-green' : '')}
      ${kpi('Suspeses', `${a.failed} <small style="font-size:1rem">de ${a.done.length}</small>`, `${a.acts.length - a.done.length} sense nota`, a.failed ? 'tone-red' : '')}
    </div>
    ${subj
      ? `<div class="panel"><h3>Notes per matèria</h3><p class="muted">Nota de l'alumne a cada matèria i mitjana de la classe</p>${fxBars(a.acts)}</div>
         ${a.terms.filter(t => t.avg != null).length >= 2 ? `<div class="panel"><h3>Evolució per període</h3><p class="muted">Mitjana de totes les matèries a cada període</p>${fxChart(a.terms.filter(t => t.avg != null).map(t => ({ nom: t.nom, v: t.avg, cls: t.cls })))}</div>` : ''}`
      : `<div class="panel"><h3>Evolució</h3><p class="muted">Nota a cada ${c.actComp && Object.values(c.actComp).some(Boolean) ? 'activitat (competencials passades a 0–10)' : 'activitat'}</p>${fxChart(a.acts)}</div>`}
    <div class="panel"><h3>Què s'ha detectat</h3>
      ${a.alerts.length ? `<ul class="fx-alerts">${a.alerts.map(x => `<li class="fx-a-${x.k}"><b>${FX_ICON[x.k]}</b><span translate="no">${esc(x.txt)}</span></li>`).join('')}</ul>` : `<p class="muted">${a.mean == null ? 'Encara no hi ha notes per analitzar.' : 'Res destacable en aquest període.'}</p>`}
    </div>
    ${a.terms.filter(t => t.n).length > 1 ? `<div class="panel"><h3>Per període</h3><div class="tbl-wrap"><table class="rep-table"><thead><tr><th class="l">Període</th><th>Alumne</th><th>Classe</th><th>Diferència</th></tr></thead><tbody>
      ${a.terms.filter(t => t.n).map(t => `<tr><td class="l" translate="no">${esc(t.nom)}</td><td><span class="pill t-${toneOf(t.avg)}">${fmt(t.avg)}</span></td><td>${fmt(t.cls)}</td><td>${t.cls != null ? sg(t.avg - t.cls) : '–'}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
    ${subj && a.matrix.length && Object.keys(c.terms || {}).length > 1 ? `<div class="panel"><h3>Matèries per període</h3><p class="muted">Fletxa = canvi respecte del període anterior</p><div class="tbl-wrap"><table class="rep-table"><thead><tr><th class="l">Matèria</th>${Object.entries(c.terms).map(([id, t]) => `<th translate="no">${esc(t.name || t.nom || id)}</th>`).join('')}</tr></thead><tbody>
      ${a.matrix.map(r => { let prev = null; return `<tr><td class="l" translate="no">${esc(r.nom)}</td>${Object.keys(c.terms).map(id => { const x = r.per[id]; const v = x?.v ?? null; const ar = v != null && prev != null ? (v - prev >= 1 ? ' ↗' : prev - v >= 1 ? ' ↘' : '') : ''; if (v != null) prev = v; return `<td>${v == null ? '–' : `<span class="pill t-${toneOf(v)}">${fmt(v)}</span>${ar}`}</td>`; }).join('')}</tr>`; }).join('')}</tbody></table></div></div>` : ''}
    <div class="panel"><h3>Detall</h3>
      ${a.acts.length ? `<div class="tbl-wrap"><table class="rep-table"><thead><tr><th class="l">Activitat / matèria</th><th>Nota</th><th>Classe</th><th>Diferència</th></tr></thead><tbody>
      ${a.acts.map(x => `<tr><td class="l" translate="no">${esc(x.nom)}</td><td>${x.v == null ? '–' : `<span class="pill t-${toneOf(x.v)}">${fmt(x.v)}</span>`}</td><td>${fmt(x.cls)}</td><td>${x.v != null && x.cls != null ? sg(x.v - x.cls) : '–'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Aquest període encara no té activitats.</p>'}
    </div>
    <div class="fx-actions">
      <button type="button" id="fxComment" class="btn btn-primary">Crear comentari de tutoria</button>
      <button type="button" id="fxGrid" class="btn">Obrir a la graella</button>
    </div>`;
  $('fxBack').addEventListener('click', () => {
    if (_fx.from === 'home') { $('navHome').click(); }
    else if (_fx.from === 'informes') { $('navReports').click(); }
    else $('navStudents').click();
  });
  $('fxSubj').addEventListener('change', e => { try { localStorage.setItem('avaluapp.fx.mat.' + c.id, e.target.checked ? '1' : '0'); } catch {} renderFitxa(); });
  $('fxTerm').addEventListener('change', e => { _fx.term = e.target.value; renderFitxa(); });
  $('fxComment').addEventListener('click', () => {
    if (window.openTutoriaModal) window.openTutoriaModal({ studentId: s.id, studentName: s.nom || '', classId: c.id });
  });
  $('fxGrid').addEventListener('click', () => {
    setActiveNav($('navHome')); showOnly('screen-class');
    document.querySelector('.tab[data-tab="notes"]')?.click();
    window.AvaluApp?.openClass?.(c.id, 'notes');
  });
}
window.AvaluFitxa = { open: openFitxa };
