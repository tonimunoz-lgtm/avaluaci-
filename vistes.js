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
    c.actNames = {};
    acts.forEach(a => { c.actNames[a.id] = a.exists ? (a.data().nom || 'Sense nom') : 'Desconeguda'; });
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

// Estadístiques d'una classe (opcionalment per a un sol grup d'avaluació)
function analyse(c, termId) {
  const terms = c.terms || {};
  const actIds = termId && terms[termId] ? (terms[termId].activities || [])
    : [...new Set(Object.values(terms).flatMap(t => t.activities || []))];
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
        <li><span class="stu-avatar" style="--hue:${hue(r.nom)}">${esc(initials(r.nom))}</span><b>${esc(r.nom)}</b>
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
const SCREENS = ['screen-classes', 'screen-class', 'screen-alumnes', 'screen-informes', 'screen-config'];
function setActiveNav(btn) {
  document.querySelectorAll('.sidebar .nav-item').forEach(b => b.classList.toggle('active', b === btn));
}
function showOnly(id) {
  SCREENS.forEach(s => $(s)?.classList.toggle('hidden', s !== id));
}

$('navHome').addEventListener('click', () => {
  setActiveNav($('navHome'));
  ['screen-alumnes', 'screen-informes', 'screen-config'].forEach(s => $(s).classList.add('hidden'));
  invalidate();
});
$('navStudents').addEventListener('click', () => { setActiveNav($('navStudents')); showOnly('screen-alumnes'); renderAlumnes(); });
$('navReports').addEventListener('click', () => { setActiveNav($('navReports')); showOnly('screen-informes'); renderInformes(); });
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
      <tr data-class="${esc(r.classId)}" data-q="${esc((r.nom + ' ' + r.classe).toLowerCase())}">
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
    setActiveNav($('navHome'));
    showOnly('screen-class');
    document.querySelector('.tab[data-tab="notes"]')?.click();
    window.AvaluApp?.openClass?.(tr.dataset.class, 'notes');
  });
}

/* ------------------------------------------------------------ pantalla Informes */
let _repSel = { cls: '', term: '' };
async function renderInformes() {
  const root = $('screen-informes');
  root.innerHTML = '<h2 class="section-title">Informes</h2><p class="muted" style="margin-top:1rem">Carregant…</p>';
  const classes = await loadAll();
  if (!classes.length) { root.innerHTML = '<h2 class="section-title">Informes</h2><div class="panel" style="margin-top:1rem">Crea una classe per veure\'n els informes.</div>'; return; }
  if (!classes.some(c => c.id === _repSel.cls) && _repSel.cls !== 'ALL') _repSel = { cls: classes[0].id, term: '' };
  const cur = classes.find(c => c.id === _repSel.cls);
  const termOpts = cur ? Object.entries(cur.terms || {}) : [];
  root.innerHTML = `
    <div class="classes-head"><h2 class="section-title">Informes</h2>
      <div class="toolbar">
        <select id="repClass" class="pill-select">${classes.map(c => `<option value="${esc(c.id)}" ${c.id === _repSel.cls ? 'selected' : ''}>${esc(c.nom || 'Sense nom')}</option>`).join('')}<option value="ALL" ${_repSel.cls === 'ALL' ? 'selected' : ''}>Totes les classes (comparativa)</option></select>
        ${cur ? `<select id="repTerm" class="pill-select"><option value="">Tots els períodes</option>${termOpts.map(([id, t]) => `<option value="${esc(id)}" ${id === _repSel.term ? 'selected' : ''}translate="no">${esc(t.name || t.nom || id)}</option>`).join('')}</select>
        <button id="repCsv" type="button"><svg viewBox="0 0 24 24"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>Exportar CSV</button>` : ''}
        <button id="repPrint" type="button"><svg viewBox="0 0 24 24"><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/></svg>Imprimir</button>
      </div></div>
    <div id="repBody">${cur ? reportHTML(cur, _repSel.term) : compareHTML(classes)}</div>`;
  $('repClass').addEventListener('change', e => { _repSel = { cls: e.target.value, term: '' }; renderInformes(); });
  $('repTerm')?.addEventListener('change', e => { _repSel.term = e.target.value; renderInformes(); });
  $('repCsv')?.addEventListener('click', () => download(`informe-${(cur.nom || 'classe').replace(/\W+/g, '_')}.csv`, csvOf(cur, _repSel.term)));
  $('repPrint').addEventListener('click', () => window.print());
}

function compareHTML(classes) {
  const rows = classes.map(c => ({ c, a: analyse(c) }));
  const max = 10;
  return `<div class="panel"><h3>Comparativa entre classes</h3><p class="muted">Mitjana de les mitjanes dels alumnes i percentatge d'aprovats</p>
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
window.addEventListener('class-opened', e => { invalidate(); switchTab(e.detail?.tab || 'notes'); });
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
  return `<select id="${id}" class="pill-select">${withAll ? `<option value="">Tots els períodes</option>` : ''}${ts.map(([k, t]) => `<option value="${esc(k)}" ${k === sel ? 'selected' : ''}translate="no">${esc(t.name || k)}</option>`).join('')}</select>`;
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

let _resTerm = '';
async function renderResum() {
  const root = $('tab-resum');
  root.innerHTML = '<p class="muted" style="padding:1rem">Carregant…</p>';
  const c = await currentClass();
  if (!c) { root.innerHTML = ''; return; }
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
  ['screen-alumnes', 'screen-informes', 'screen-config'].forEach(s => $(s).classList.add('hidden'));
  window.AvaluApp?.openClass?.(b.dataset.id, 'comentaris');
});
