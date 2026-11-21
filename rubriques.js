// rubriques.js — Fase 7: rúbriques per a les activitats competencials
//
// Cada activitat competencial pot tenir una rúbrica: una llista de criteris (guardada a activitats/{id}.rubrica).
// Per a cada alumne es marca el nivell (NA / AS / AN / AE) de cada criteri (guardat a alumnes/{id}.rubriques.{activitat})
// i la nota de la cel·la (0-4) es calcula com a mitjana dels nivells. La nota s'escriu a la cel·la amb el mateix
// esdeveniment `change` que quan s'escriu a mà: desat, recàlculs de fórmules i historial funcionen igual.

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const db = () => firebase.firestore();
const LEVELS = ['NA', 'AS', 'AN', 'AE'];
const COLORS = { NA: ['#ef4444', '#fff'], AS: ['#f97316', '#fff'], AN: ['#eab308', '#000'], AE: ['#22c55e', '#fff'] };
const DEFAULT_TRAMS = { NA: { min: 0, max: 2 }, AS: { min: 2, max: 2.5 }, AN: { min: 2.5, max: 3 }, AE: { min: 3, max: 4 } };

/* ------------------------------------------------------------------ estils */
(function () {
  const st = document.createElement('style');
  st.textContent = `
  .comp-badge.has-rb { display: flex !important; align-items: center; justify-content: space-between; gap: .3rem; padding-left: 0 !important; cursor: pointer; }
  .comp-badge.has-rb::before { content: attr(data-rb); font-size: .62rem; font-weight: 700; padding: 0 .45rem; border-right: 1.5px solid currentColor; opacity: .85; line-height: 1.5; }
  .comp-badge.has-rb:hover::before { text-decoration: underline; }
  .rb-btn { border: 0; background: #efe9ff; color: #4a2fd4; border-radius: 8px; font-size: .7rem; font-weight: 700; padding: .12rem .45rem; cursor: pointer; line-height: 1.2; }
  .rb-btn.done { background: #4a2fd4; color: #fff; }
  .rb-ov { position: fixed; inset: 0; z-index: 9600; display: flex; align-items: center; justify-content: center; background: rgba(20,10,60,.45); backdrop-filter: blur(3px); padding: 1rem; }
  .rb-card { background: #fff; border-radius: 24px; width: 100%; max-width: 38rem; max-height: calc(90vh / var(--zf, 1)); display: flex; flex-direction: column; box-shadow: 0 30px 80px rgba(20,10,60,.35); overflow: hidden; color: #231a5c; }
  .rb-head { display: flex; align-items: center; justify-content: space-between; gap: .6rem; padding: 1rem 1.3rem; border-bottom: 1px solid #ece9fb; }
  .rb-head h3 { margin: 0; font-size: 1.05rem; font-weight: 700; min-width: 0; overflow-wrap: anywhere; }
  .rb-x { flex: none; border: 0; background: #f1effd; border-radius: 50%; width: 2rem; height: 2rem; cursor: pointer; color: #4a2fd4; }
  .rb-body { overflow-y: auto; padding: .6rem 1.3rem 1rem; }
  .rb-note { font-size: .8rem; color: #7a7799; margin: .5rem 0 .8rem; }
  .rb-crit { padding: .7rem 0; border-bottom: 1px solid #f1effd; }
  .rb-crit .rb-n { font-weight: 600; font-size: .92rem; margin-bottom: .45rem; overflow-wrap: anywhere; }
  .rb-lv { display: grid; grid-template-columns: repeat(4, 1fr); gap: .4rem; }
  .rb-lv button { border: 2px solid #e1dcfa; background: #fff; color: #4a4670; border-radius: 12px; padding: .55rem 0; font-weight: 800; font-size: .85rem; cursor: pointer; }
  .rb-lv button.on { border-color: transparent; }
  .rb-row { display: flex; gap: .5rem; align-items: center; margin-bottom: .5rem; }
  .rb-row input { flex: 1; min-width: 0; border: 1.5px solid #d9d3fb; border-radius: 12px; padding: .55rem .8rem; font-size: .92rem; color: #231a5c; background: #fff; }
  .rb-pct { flex: none; display: flex; align-items: center; gap: .25rem; font-weight: 700; color: #7a7799; }
  .rb-pct input { flex: none; width: 4.6rem; text-align: right; }
  .rb-tot { margin-top: .9rem; font-size: .85rem; font-weight: 700; padding: .5rem .8rem; border-radius: 12px; }
  .rb-tot.ok { background: #e9f9f1; color: #0f6b4a; }
  .rb-tot.bad { background: #fff4e0; color: #a85a00; }
  .rb-w { color: #7a7799; font-weight: 700; margin-left: .3rem; }
  .rb-row button { flex: none; border: 0; background: #fde8ee; color: #c0143c; border-radius: 10px; width: 2rem; height: 2rem; cursor: pointer; }
  .rb-foot { display: flex; align-items: center; justify-content: space-between; gap: .6rem; flex-wrap: wrap; padding: .9rem 1.3rem; border-top: 1px solid #ece9fb; background: #faf9ff; }
  .rb-res { display: flex; align-items: center; gap: .6rem; font-weight: 800; font-size: 1.25rem; }
  .rb-res .bd { font-size: .8rem; padding: .15rem .6rem; border-radius: 8px; }
  .rb-b { border: 1.5px solid #d9d3fb; background: #fff; color: #4a2fd4; border-radius: 999px; padding: .5rem 1.1rem; font-weight: 700; font-size: .88rem; cursor: pointer; }
  .rb-b.primary { background: #5b3df5; border-color: #5b3df5; color: #fff; }
  .rb-b.danger { color: #c0143c; border-color: #f3c0cc; }
  .rb-b[disabled] { opacity: .45; cursor: default; }
  `;
  document.head.appendChild(st);
})();

/* ------------------------------------------------------------------ trams i càlcul */
let _trams = null;
async function trams() {
  if (_trams) return _trams;
  try {
    const u = firebase.auth().currentUser;
    const d = await db().collection('professors').doc(u.uid).get();
    _trams = (d.exists && d.data().competencyTrams) || DEFAULT_TRAMS;
  } catch { _trams = DEFAULT_TRAMS; }
  return _trams;
}
const levelValue = (T, l) => Math.round(((T[l].min + T[l].max) / 2) * 100) / 100; // valor representatiu: centre del tram
function toLevel(T, v) {
  const e = Object.entries(T).sort((a, b) => a[1].min - b[1].min); const last = e[e.length - 1][0];
  for (const [l, r] of e) if (v >= r.min && (v < r.max || (l === last && v <= r.max))) return l;
  return v < e[0][1].min ? e[0][0] : last;
}
// Pes d'un criteri: el seu % o, si la rúbrica no en té (rúbriques antigues), el mateix per a tots
const wOf = (c, crits) => (typeof c.pes === 'number' ? c.pes : 100 / crits.length);
function score(T, ratings, crits) {
  let sum = 0, ws = 0;
  crits.forEach(c => { const l = ratings[c.id]; if (!l) return; const w = wOf(c, crits); sum += levelValue(T, l) * w; ws += w; });
  return ws > 0 ? Math.round(sum / ws * 100) / 100 : null;   // si falten criteris, es reparteix entre els marcats
}
const round2 = n => Math.round(n * 100) / 100;
function equalWeights(crits) {
  const n = crits.length; if (!n) return;
  const base = Math.floor(10000 / n) / 100;
  crits.forEach(c => { c.pes = base; });
  crits[n - 1].pes = round2(100 - base * (n - 1));           // l'últim recull l'arrodoniment: suma exacta 100
}
const fmtP = n => String(round2(n)).replace('.', ',');

/* ------------------------------------------------------------------ dades */
const _rub = new Map(); // activitat -> rúbrica | null
async function getRubric(actId, force) {
  if (!force && _rub.has(actId)) return _rub.get(actId);
  let r = null;
  try { const d = await db().collection('activitats').doc(actId).get(); r = d.exists ? (d.data().rubrica || null) : null; } catch {}
  if (r && !(r.criteris || []).length) r = null;
  _rub.set(actId, r);
  return r;
}
const uid8 = () => Math.random().toString(36).slice(2, 8);

/* ------------------------------------------------------------------ modals */
function modal(title, bodyHTML, footHTML) {
  $('.rb-ov')?.remove();
  const ov = document.createElement('div'); ov.className = 'rb-ov';
  ov.innerHTML = `<div class="rb-card" role="dialog" aria-modal="true"><div class="rb-head"><h3 translate="no">${title}</h3><button type="button" class="rb-x" aria-label="Tanca" title="Tanca">✕</button></div>
    <div class="rb-body">${bodyHTML}</div><div class="rb-foot">${footHTML}</div></div>`;
  const close = () => ov.remove();
  ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
  $('.rb-x', ov).addEventListener('click', close);
  document.body.appendChild(ov);
  return { ov, close };
}
const notify = m => (window.notify ? window.notify(m) : alert(m));

// ---- definir la rúbrica d'una activitat
async function editRubric(actId, actName) {
  const cur = await getRubric(actId, true);
  let crits = (cur?.criteris || []).map(c => ({ ...c }));
  if (!crits.length) crits = [{ id: uid8(), nom: '' }, { id: uid8(), nom: '' }, { id: uid8(), nom: '' }];
  if (crits.some(c => typeof c.pes !== 'number')) equalWeights(crits);
  const { ov, close } = modal(`Rúbrica · ${esc(actName)}`,
    '<p class="rb-note">Escriu els criteris que avalues (per exemple «Participació», «Resolució del problema») i el pes de cadascun. La nota de cada alumne serà la mitjana ponderada dels nivells que marquis.</p><div id="rbList"></div><div style="display:flex;gap:.5rem;flex-wrap:wrap"><button type="button" class="rb-b" id="rbAdd">+ Afegir criteri</button><button type="button" class="rb-b" id="rbEq">Mateix pes per a tots</button></div><div id="rbTot" class="rb-tot"></div>',
    `${cur ? '<button type="button" class="rb-b danger" id="rbDel">Treu la rúbrica</button>' : '<span></span>'}<span style="display:flex;gap:.5rem"><button type="button" class="rb-b" id="rbCancel">Cancel·la</button><button type="button" class="rb-b primary" id="rbSave">Desa</button></span>`);
  const total = () => round2(crits.reduce((t, c) => t + (Number(c.pes) || 0), 0));
  const upTotal = () => {
    const t = total(), ok = Math.abs(t - 100) < 0.01;
    const el = $('#rbTot', ov);
    el.className = 'rb-tot ' + (ok ? 'ok' : 'bad');
    el.textContent = ok ? '✓ Total dels pesos: 100 %' : `Els pesos sumen ${fmtP(t)} % (han de sumar 100 %)` + (t < 100 ? ` · en falten ${fmtP(100 - t)} %` : ` · en sobren ${fmtP(t - 100)} %`);
    $('#rbSave', ov).disabled = !ok;
  };
  const draw = () => {
    $('#rbList', ov).innerHTML = crits.map((c, i) => `<div class="rb-row"><input type="text" data-i="${i}" value="${esc(c.nom)}" placeholder="Criteri ${i + 1}" translate="no">
      <span class="rb-pct"><input type="number" min="0" max="100" step="any" inputmode="decimal" data-p="${i}" value="${c.pes ?? ''}" aria-label="Pes en %" placeholder="—"> %</span>
      <button type="button" data-d="${i}" aria-label="Elimina" title="Elimina">✕</button></div>`).join('');
    upTotal();
  };
  draw();
  ov.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset?.i != null) crits[+t.dataset.i].nom = t.value;
    if (t.dataset?.p != null) { crits[+t.dataset.p].pes = Math.max(0, Number(t.value) || 0); upTotal(); }
  });
  ov.addEventListener('click', e => {
    const d = e.target.closest('[data-d]'); if (d) { crits.splice(+d.dataset.d, 1); draw(); }
  });
  $('#rbAdd', ov).addEventListener('click', () => {
    const rest = Math.max(0, round2(100 - total()));            // el nou criteri agafa el que falta fins a 100
    crits.push({ id: uid8(), nom: '', pes: rest }); draw(); ov.querySelector('.rb-row:last-of-type input[type=text]')?.focus();
  });
  $('#rbEq', ov).addEventListener('click', () => { equalWeights(crits); draw(); });
  $('#rbCancel', ov).addEventListener('click', close);
  $('#rbSave', ov).addEventListener('click', async () => {
    const clean = crits.map(c => ({ id: c.id, nom: c.nom.trim(), pes: round2(Number(c.pes) || 0) })).filter(c => c.nom);
    if (!clean.length) { notify('Escriu almenys un criteri'); return; }
    const t = round2(clean.reduce((n, c) => n + c.pes, 0));
    if (Math.abs(t - 100) >= 0.01) { notify(`Els pesos han de sumar 100 % (ara sumen ${fmtP(t)} %). Fes servir «Mateix pes per a tots» o ajusta'ls.`); return; }
    try { await db().collection('activitats').doc(actId).update({ rubrica: { criteris: clean } }); _rub.set(actId, { criteris: clean }); close(); notify('Rúbrica desada'); decorate(); }
    catch (e) { notify('No s\'ha pogut desar la rúbrica: ' + e.message); }
  });
  $('#rbDel', ov)?.addEventListener('click', async () => {
    if (!confirm('Vols treure la rúbrica d\'aquesta activitat? Les notes no es canvien.')) return;
    try { await db().collection('activitats').doc(actId).update({ rubrica: firebase.firestore.FieldValue.delete() }); _rub.set(actId, null); close(); decorate(true); }
    catch (e) { notify('No s\'ha pogut treure la rúbrica: ' + e.message); }
  });
}

// ---- avaluar un alumne amb la rúbrica
async function evalStudent(actId, studentId, input) {
  const [rub, T, sd] = await Promise.all([getRubric(actId), trams(), db().collection('alumnes').doc(studentId).get()]);
  if (!rub) return;
  const tr = input.closest('tr');
  const sn = (tr?.querySelector('.stu-name')?.textContent || '').trim();
  const an = ($(`#notesThead th[data-activity-id="${CSS.escape(actId)}"] .act-name`)?.textContent || '').trim();
  const ratings = { ...(sd.exists ? (sd.data().rubriques || {})[actId] || {} : {}) };
  const crits = rub.criteris;
  const body = () => crits.map(c => `<div class="rb-crit"><div class="rb-n"><span translate="no">${esc(c.nom)}</span> <small class="rb-w" translate="no">${fmtP(wOf(c, crits))} %</small></div><div class="rb-lv">${LEVELS.map(l => {
    const on = ratings[c.id] === l;
    return `<button type="button" data-c="${esc(c.id)}" data-l="${l}" class="${on ? 'on' : ''}" style="${on ? `background:${COLORS[l][0]};color:${COLORS[l][1]}` : ''}">${l}</button>`;
  }).join('')}</div></div>`).join('');
  const { ov, close } = modal(`${esc(sn)} · ${esc(an)}`, '<div id="rbBody"></div>',
    `<div class="rb-res"><span id="rbVal" translate="no">—</span><span class="bd" id="rbBd" translate="no"></span></div><span style="display:flex;gap:.5rem"><button type="button" class="rb-b" id="rbCancel">Cancel·la</button><button type="button" class="rb-b primary" id="rbSave">Desa i aplica</button></span>`);
  const refresh = () => {
    $('#rbBody', ov).innerHTML = body();
    const v = score(T, ratings, crits);
    $('#rbVal', ov).textContent = v == null ? '—' : String(v).replace('.', ',');
    const bd = $('#rbBd', ov);
    if (v == null) { bd.textContent = ''; bd.style.background = ''; }
    else { const l = toLevel(T, v); bd.textContent = l; bd.style.background = COLORS[l][0]; bd.style.color = COLORS[l][1]; }
    $('#rbSave', ov).disabled = v == null && !Object.keys(ratings).length && !input.value;
  };
  refresh();
  ov.addEventListener('click', e => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    const { c, l } = b.dataset;
    if (ratings[c] === l) delete ratings[c]; else ratings[c] = l;   // tornar a prémer el mateix nivell el treu
    refresh();
  });
  $('#rbCancel', ov).addEventListener('click', close);
  $('#rbSave', ov).addEventListener('click', async () => {
    const v = score(T, ratings, crits);
    try {
      await db().collection('alumnes').doc(studentId).update({
        [`rubriques.${actId}`]: Object.keys(ratings).length ? ratings : firebase.firestore.FieldValue.delete()
      });
    } catch (e) { notify('No s\'ha pogut desar la rúbrica: ' + e.message); return; }
    const target = document.querySelector(`#notesTbody tr[data-student-id="${CSS.escape(studentId)}"] input[data-activity-id="${CSS.escape(actId)}"][data-is-competency-numeric="true"]`) || input;
    const newVal = v == null ? '' : String(v);
    if (target && !target.disabled && target.value !== newVal) {
      target.dataset.hPrev = target.value;
      target.value = newVal;
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
    }
    close();
  });
}

/* ------------------------------------------------------------------ integració a la graella */
let _t = 0, _busy = false;
async function decorate(force) {
  if (_busy) return; _busy = true;
  try {
    const cells = [...document.querySelectorAll('#notesTbody input[data-is-competency-numeric="true"]')];
    const acts = [...new Set(cells.map(i => i.dataset.activityId))];
    await Promise.all(acts.map(a => getRubric(a, force)));
    // botó «Rúbrica» al menú de la capçalera de cada activitat competencial
    acts.forEach(a => {
      const th = document.querySelector(`#notesThead th[data-activity-id="${CSS.escape(a)}"]`);
      const menu = th?.querySelector('.menu');
      if (!menu || menu.querySelector('.rb-menu')) return;
      const name = (th.querySelector('.act-name')?.textContent || '').trim();
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'rb-menu px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700';
      b.textContent = 'Rúbrica';
      b.addEventListener('click', e => { e.stopPropagation(); menu.classList.add('hidden'); editRubric(a, name); });
      menu.insertBefore(b, menu.querySelector('.clear-btn') || null);
    });
    // La insígnia NA/AS/AN/AE es parteix en dos: a l'esquerra «Rúbrica» (mateix color) i a la dreta el nivell.
    cells.forEach(inp => {
      const w = inp.closest('.comp-cell-wrapper'); if (!w) return;
      w.querySelector('.rb-btn')?.remove();                       // restes de la versió anterior
      const bd = w.querySelector('.comp-badge'); if (!bd) return;
      const has = _rub.get(inp.dataset.activityId) && !inp.disabled;
      bd.classList.toggle('has-rb', !!has);
      if (!has) { delete bd.dataset.rb; bd.removeAttribute('title'); return; }
      bd.dataset.rb = window.t ? window.t('Rúbrica') : 'Rúbrica';
      bd.title = 'Fes clic a «Rúbrica» per avaluar aquest alumne amb la rúbrica';
      if (bd.dataset.rbWired) return;
      bd.dataset.rbWired = '1';
      bd.addEventListener('click', e => {
        if (!bd.classList.contains('has-rb')) return;
        const r = bd.getBoundingClientRect();
        if ((e.clientX - r.left) / r.width > 0.55) return;         // només la meitat esquerra
        e.preventDefault(); e.stopPropagation();
        evalStudent(inp.dataset.activityId, inp.dataset.studentId || inp.closest('tr')?.dataset.studentId, inp);
      });
    });
  } finally { _busy = false; }
}
const later = () => { clearTimeout(_t); _t = setTimeout(() => decorate(), 700); };
window.addEventListener('grid-rendered', later);
// Només la graella (no tot el document): així no es dispara amb cada canvi de la pàgina
['notesTbody', 'notesThead'].forEach(id => { const el = document.getElementById(id); if (el) new MutationObserver(later).observe(el, { childList: true, subtree: true }); });

window.Rubriques = { edit: editRubric, getRubric, trams, levelValue };
