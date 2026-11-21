// historial.js — Fase 2: xarxa de seguretat
//  1) Cada canvi de nota a la graella queda registrat (en aquest dispositiu, últims 30 dies).
//  2) Pantalla «Historial» (menú lateral): llista paginada dels canvis, amb opció de restaurar el valor anterior.
//  3) Còpia de seguretat automàtica setmanal al núvol + restaurar des de Configuració.
//
// Cap d'aquestes funcions toca el flux existent de desat: «desfer» simplement reescriu el valor
// de la cel·la i dispara el mateix esdeveniment `change`, de manera que el desat i els
// recàlculs automàtics funcionen exactament igual que quan s'escriu la nota a mà.

const HIST_MAX = 600;          // canvis guardats per professor (en aquest dispositiu)
const HIST_DAYS = 30;          // dies que es conserva l'historial
const PAGE = 20;               // canvis per pàgina a la pantalla Historial
const KEEP_WEEKS = 8;          // setmanes de còpies que es conserven al núvol
const MAX_COPY_CHARS = 900000; // límit d'un document de Firestore (~1 MB)

const $ = (sel, root = document) => root.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => { try { return firebase.auth().currentUser?.uid || null; } catch { return null; } };
const db = () => firebase.firestore();

/* ------------------------------------------------------------------ estils */
(function injectStyles() {
  const st = document.createElement('style');
  st.id = 'histStyles';
  st.textContent = `
  .hist-overlay { position: fixed; inset: 0; z-index: 9500; display: flex; align-items: center; justify-content: center;
    background: rgba(20,10,60,.45); backdrop-filter: blur(3px); padding: 1rem; }
  .hist-card { background: #fff; border-radius: 24px; width: 100%; max-width: 40rem; max-height: calc(88vh / var(--zf, 1));
    display: flex; flex-direction: column; box-shadow: 0 30px 80px rgba(20,10,60,.35); overflow: hidden; }
  .hist-head { display: flex; align-items: center; justify-content: space-between; padding: 1.1rem 1.3rem; border-bottom: 1px solid #ece9fb; }
  .hist-head h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #231a5c; }
  .hist-x { border: 0; background: #f1effd; border-radius: 50%; width: 2rem; height: 2rem; cursor: pointer; font-size: 1rem; color: #4a2fd4; }
  .hist-body { overflow-y: auto; padding: .4rem 1.3rem 1.2rem; }
  .hist-note { font-size: .8rem; color: #7a7799; margin: .7rem 0; }
  .hist-row { display: flex; align-items: center; gap: .7rem; padding: .6rem 0; border-bottom: 1px solid #f1effd; font-size: .86rem; }
  .hist-row .hr-main { flex: 1; min-width: 0; }
  .hist-row .hr-who { font-weight: 600; color: #231a5c; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hist-row .hr-sub { color: #7a7799; font-size: .76rem; }
  .hist-row .hr-val { font-weight: 700; color: #4a2fd4; white-space: nowrap; }
  .hist-btn { border: 1.5px solid #d9d3fb; background: #fff; color: #4a2fd4; border-radius: 999px; padding: .32rem .8rem;
    font-weight: 700; font-size: .78rem; cursor: pointer; white-space: nowrap; }
  .hist-btn:hover { background: #f4f1ff; }
  .hist-btn.primary { background: #5b3df5; color: #fff; border-color: #5b3df5; }
  .hist-btn.danger { color: #c0143c; border-color: #f3c0cc; }
  .hist-btn[disabled] { opacity: .45; cursor: default; }
  .hist-empty { text-align: center; color: #7a7799; padding: 2rem 0; font-size: .9rem; }
  #cf_cops .hist-row { flex-wrap: wrap; }
  #cf_cops .hr-main { flex: 1 1 100%; }
  #cf_cops .hr-who { white-space: normal; }
  .cop-status { font-size: .85rem; margin: 0 0 .7rem; color: #4a4670; }
  .cop-status.warn { color: #a85a00; background: #fff4e0; border-radius: 12px; padding: .6rem .8rem; }
  .cop-week { margin: .9rem 0 .2rem; font-size: .78rem; font-weight: 700; color: #7a7799; text-transform: uppercase; letter-spacing: .04em; }
  `;
  document.head.appendChild(st);
})();

/* ------------------------------------------------------------------ 1) registre local + «Desfer» */
const histKey = () => `avaluapp.hist.${uid() || 'anon'}`;
function loadHist() {
  const min = Date.now() - HIST_DAYS * 86400000;
  try { return JSON.parse(localStorage.getItem(histKey()) || '[]').filter(e => e.t >= min); } catch { return []; }
}
function saveHist(list) { try { localStorage.setItem(histKey(), JSON.stringify(list.slice(-HIST_MAX))); } catch {} }

let _undoing = false;

function inputOf(entry) {
  return document.querySelector(`#notesTbody tr[data-student-id="${CSS.escape(entry.s)}"] :is(input.table-input, input[data-is-competency-numeric="true"])[data-activity-id="${CSS.escape(entry.a)}"]`);
}
function applyValue(entry, value) {
  const inp = inputOf(entry);
  if (!inp || inp.disabled) return false;
  _undoing = true;
  try {
    inp.value = value ?? '';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  } finally { _undoing = false; }
  return true;
}

// valor anterior: es captura en entrar a la cel·la
document.addEventListener('focusin', e => {
  const inp = e.target;
  if (inp?.matches?.('#notesTbody :is(input.table-input, input[data-is-competency-numeric="true"])[data-activity-id]')) inp.dataset.hPrev = inp.value;
}, true);

document.addEventListener('change', e => {
  const inp = e.target;
  if (!inp?.matches?.('#notesTbody :is(input.table-input, input[data-is-competency-numeric="true"])[data-activity-id]') || inp.disabled) return;
  const before = inp.dataset.hPrev;
  const after = inp.value;
  inp.dataset.hPrev = after;
  if (before === undefined || before === after) return;
  const tr = inp.closest('tr');
  const th = document.querySelector(`#notesThead th[data-activity-id="${CSS.escape(inp.dataset.activityId)}"]`);
  const entry = {
    t: Date.now(),
    c: window.AvaluApp?.getClassId?.() || '',
    cn: (document.getElementById('classTitle')?.textContent || '').trim().slice(0, 60),
    s: tr?.dataset.studentId || '',
    a: inp.dataset.activityId,
    sn: (tr?.querySelector('.stu-name')?.textContent || '').trim(),
    an: (th?.querySelector('.act-name')?.textContent || th?.textContent || inp.dataset.activityId).trim().slice(0, 60),
    b: before, v: after, u: _undoing ? 1 : 0
  };
  const list = loadHist(); list.push(entry); saveHist(list);
}, true);

/* ------------------------------------------------------------------ 2) historial de la classe */
function closeOverlay() { $('.hist-overlay')?.remove(); }
function overlay(title, bodyHTML) {
  closeOverlay();
  const ov = document.createElement('div');
  ov.className = 'hist-overlay';
  ov.innerHTML = `<div class="hist-card" role="dialog" aria-modal="true"><div class="hist-head"><h3>${title}</h3><button type="button" class="hist-x" aria-label="Tanca" title="Tanca">✕</button></div><div class="hist-body">${bodyHTML}</div></div>`;
  ov.addEventListener('click', e => { if (e.target === ov) closeOverlay(); });
  $('.hist-x', ov).addEventListener('click', closeOverlay);
  document.body.appendChild(ov);
  return ov;
}
const fmtDT = t => { const d = new Date(t); const p = n => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`; };
const fmtV = v => (v === '' || v == null) ? '—' : esc(v);


let _hp = { page: 0, cls: '' };
function renderScreen(root) {
  if (!root) return;
  const all = loadHist().reverse();
  const classes = new Map();
  all.forEach(e => { if (e.c && !classes.has(e.c)) classes.set(e.c, e.cn || 'Classe'); });
  if (_hp.cls && !classes.has(_hp.cls)) _hp.cls = '';
  const rows = all.filter(e => !_hp.cls || e.c === _hp.cls);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  _hp.page = Math.min(Math.max(_hp.page, 0), pages - 1);
  const view = rows.slice(_hp.page * PAGE, _hp.page * PAGE + PAGE);
  const day = t => { const d = new Date(t); const p = n => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`; };
  let lastDay = '', html = '';
  view.forEach((e, i) => {
    const dd = day(e.t);
    if (dd !== lastDay) { lastDay = dd; html += `<div class="cop-week" translate="no">${dd}</div>`; }
    const hh = new Date(e.t); const tm = `${String(hh.getHours()).padStart(2, '0')}:${String(hh.getMinutes()).padStart(2, '0')}`;
    html += `<div class="hist-row"><div class="hr-main"><div class="hr-who" translate="no">${esc(e.sn)} · ${esc(e.an)}</div>
      <div class="hr-sub"><span translate="no">${tm} · ${esc(e.cn || '')}</span>${e.u ? ' · <span>Restaurat</span>' : ''}</div></div>
      <div class="hr-val" translate="no">${fmtV(e.b)} → ${fmtV(e.v)}</div>
      <button type="button" class="hist-btn" data-i="${_hp.page * PAGE + i}">Restaura</button></div>`;
  });
  root.innerHTML = `<h2 class="section-title">Historial</h2>
    <div class="card" style="margin-top:1rem;padding:1.2rem 1.4rem">
      <div style="display:flex;flex-wrap:wrap;gap:.7rem;align-items:center;justify-content:space-between">
        <p class="hist-note" style="margin:0">Canvis de notes fets en aquest dispositiu durant els últims ${HIST_DAYS} dies. «Restaura» obre la classe i torna la cel·la al valor anterior.</p>
        <select id="hsCls" class="hist-btn" style="padding:.4rem .8rem"><option value="">Totes les classes</option>${[...classes].map(([id, n]) => `<option value="${esc(id)}" ${_hp.cls === id ? 'selected' : ''} translate="no">${esc(n)}</option>`).join('')}</select>
      </div>
      ${view.length ? html : '<div class="hist-empty">Encara no hi ha canvis registrats.</div>'}
      ${rows.length > PAGE ? `<div style="display:flex;align-items:center;justify-content:center;gap:.8rem;margin-top:1rem">
        <button type="button" class="hist-btn" id="hsPrev" ${_hp.page === 0 ? 'disabled' : ''}>← Anterior</button>
        <span class="hist-note" style="margin:0" translate="no">${_hp.page + 1} / ${pages}</span>
        <button type="button" class="hist-btn" id="hsNext" ${_hp.page >= pages - 1 ? 'disabled' : ''}>Següent →</button></div>` : ''}
      ${all.length ? '<div style="text-align:right;margin-top:1rem"><button type="button" class="hist-btn danger" id="hsClear">Esborra l\'historial</button></div>' : ''}
    </div>`;
  root.querySelector('#hsCls')?.addEventListener('change', e => { _hp = { page: 0, cls: e.target.value }; renderScreen(root); });
  root.querySelector('#hsPrev')?.addEventListener('click', () => { _hp.page--; renderScreen(root); });
  root.querySelector('#hsNext')?.addEventListener('click', () => { _hp.page++; renderScreen(root); });
  root.querySelector('#hsClear')?.addEventListener('click', () => {
    if (!confirm('Vols esborrar l\'historial d\'aquest dispositiu? Les notes no es toquen.')) return;
    saveHist([]); _hp = { page: 0, cls: '' }; renderScreen(root);
  });
  root.querySelectorAll('.hist-btn[data-i]').forEach(b => b.addEventListener('click', () => restoreEntry(rows[+b.dataset.i], b)));
}

// Obre la classe i hi reescriu el valor anterior (així es recalculen les columnes amb fórmula i queda registrat)
async function restoreEntry(e, btn) {
  if (!e) return;
  btn.disabled = true;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  try {
    document.getElementById('navHome')?.click();
    window.AvaluApp?.openClass?.(e.c, 'notes');
    await wait(400);
    for (let k = 0; k < 40 && !(window.AvaluApp?.getClassId?.() === e.c && inputOf(e)); k++) await wait(150);
    if (applyValue(e, e.b)) { btn.textContent = 'Fet'; window.notify?.('Nota restaurada'); }
    else { btn.disabled = false; window.notify?.('No s\'ha pogut restaurar: la cel·la ja no existeix o està bloquejada'); }
  } catch (err) { btn.disabled = false; window.notify?.('No s\'ha pogut restaurar: ' + err.message); }
}

/* ------------------------------------------------------------------ 3) còpies setmanals al núvol */
function weekId(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const w = Math.ceil(((t - y0) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(w).padStart(2, '0')}`;
}
const copiesRef = u => db().collection('professors').doc(u).collection('copies');
const stateKey = u => `avaluapp.copia.${u}`;
const getState = u => { try { return JSON.parse(localStorage.getItem(stateKey(u)) || '{}'); } catch { return {}; } };
const setState = (u, p) => { try { localStorage.setItem(stateKey(u), JSON.stringify({ ...getState(u), ...p })); } catch {} };

async function snapshotClass(cid) {
  const cd = await db().collection('classes').doc(cid).get();
  if (!cd.exists) return null;
  const c = cd.data();
  const acts = new Set();
  Object.values(c.terms || {}).forEach(t => (t.activities || []).forEach(a => acts.add(a)));
  (c.activitats || []).forEach(a => acts.add(a));
  const [als, ats] = await Promise.all([
    Promise.all((c.alumnes || []).map(id => db().collection('alumnes').doc(id).get())),
    Promise.all([...acts].map(id => db().collection('activitats').doc(id).get()))
  ]);
  const alumnes = {}; als.forEach(d => { if (d.exists) alumnes[d.id] = d.data(); });
  const activitats = {}; ats.forEach(d => { if (d.exists) activitats[d.id] = d.data(); });
  return { nom: c.nom || 'Sense nom', n: Object.keys(alumnes).length, json: JSON.stringify({ v: 1, classId: cid, class: c, alumnes, activitats }) };
}

async function makeCopies({ tipus = 'auto', label, onlyClass } = {}) {
  const u = uid(); if (!u) throw new Error('Sense sessió');
  const wk = label || weekId();
  const prof = await db().collection('professors').doc(u).get();
  const ids = onlyClass ? [onlyClass] : (prof.data()?.classes || []);
  let done = 0, skipped = 0;
  for (const cid of ids) {
    const snap = await snapshotClass(cid);
    if (!snap) continue;
    if (snap.json.length > MAX_COPY_CHARS) { skipped++; console.warn('Còpia massa gran per a la classe', cid); continue; }
    await copiesRef(u).doc(`${wk}_${tipus === 'pre' ? 'pre' + Date.now() + '_' : ''}${cid}`).set({
      week: wk, tipus, classId: cid, nom: snap.nom, n: snap.n, json: snap.json,
      ts: firebase.firestore.FieldValue.serverTimestamp()
    });
    done++;
  }
  return { done, skipped };
}

async function pruneOld(u) {
  const d = new Date(); d.setDate(d.getDate() - KEEP_WEEKS * 7);
  const old = await copiesRef(u).where('week', '<', weekId(d)).get();
  await Promise.all(old.docs.map(x => x.ref.delete()));
}

async function ensureWeekly() {
  const u = uid(); if (!u || !navigator.onLine) return;
  const wk = weekId();
  if (getState(u).ok === wk) return;
  try {
    const has = await copiesRef(u).where('week', '==', wk).limit(1).get();
    if (has.empty) { await makeCopies({ tipus: 'auto' }); await pruneOld(u); }
    setState(u, { ok: wk, denied: false, last: Date.now() });
  } catch (e) {
    console.warn('Còpia automàtica no disponible:', e.code || e.message);
    if (e.code === 'permission-denied') setState(u, { denied: true });
  }
}

try {
  firebase.auth().onAuthStateChanged(user => { if (user) setTimeout(ensureWeekly, 12000); });
} catch (e) { console.warn('historial.js: auth no disponible', e); }

/* ---- restaurar / descarregar ---- */
function revive(v) {
  if (Array.isArray(v)) return v.map(revive);
  if (v && typeof v === 'object') {
    const k = Object.keys(v);
    if ('seconds' in v && 'nanoseconds' in v && k.every(x => ['seconds', 'nanoseconds', 'type'].includes(x))) return new firebase.firestore.Timestamp(v.seconds, v.nanoseconds);
    const o = {}; k.forEach(x => { o[x] = revive(v[x]); }); return o;
  }
  return v;
}

async function restoreData(classId, data, { strictPre = true } = {}) {
  const u = uid();
  // 1) còpia de seguretat de l'estat actual, per poder tornar enrere
  try { await makeCopies({ tipus: 'pre', label: 'abans-de-restaurar', onlyClass: classId }); }
  catch (e) { if (strictPre) throw new Error('No s\'ha pogut fer la còpia prèvia: ' + e.message); console.warn('Sense còpia prèvia:', e.message); }
  // 2) la classe ha de ser a la llista del professor
  await db().collection('professors').doc(u).update({ classes: firebase.firestore.FieldValue.arrayUnion(classId) });
  // 3) reescriure classe, alumnes i activitats per lots
  const ops = [
    [db().collection('classes').doc(classId), revive(data.class)],
    ...Object.entries(data.alumnes || {}).map(([id, d]) => [db().collection('alumnes').doc(id), revive(d)]),
    ...Object.entries(data.activitats || {}).map(([id, d]) => [db().collection('activitats').doc(id), revive(d)])
  ];
  for (let i = 0; i < ops.length; i += 400) {
    const b = db().batch();
    ops.slice(i, i + 400).forEach(([ref, d]) => b.set(ref, d));
    await b.commit();
  }
}
const restoreCopy = docSnap => restoreData(docSnap.data().classId, JSON.parse(docSnap.data().json));

// Fitxers JSON: accepta tant la còpia d'una classe (botó «Descarrega» de les còpies)
// com la còpia completa de Configuració → Dades.
function parseBackupFile(text) {
  const j = JSON.parse(text);
  if (j && j.v === 1 && j.classId && j.class) return [{ classId: j.classId, nom: j.class.nom || 'Sense nom', data: { class: j.class, alumnes: j.alumnes || {}, activitats: j.activitats || {} } }];
  if (j && Array.isArray(j.classes)) {
    return j.classes.filter(c => c && c.id).map(c => {
      const { id, alumnesDades, activitatsDades, ...cls } = c;
      const alumnes = {}; (alumnesDades || []).forEach(({ id: i, ...d }) => { alumnes[i] = d; });
      const activitats = {}; (activitatsDades || []).forEach(({ id: i, ...d }) => { activitats[i] = d; });
      return { classId: id, nom: cls.nom || 'Sense nom', data: { class: cls, alumnes, activitats } };
    });
  }
  throw new Error('El fitxer no és una còpia d\'AvaluApp');
}

function chooseClasses(items) {
  return new Promise(res => {
    const ov = overlay('Restaurar des d\'un fitxer', `
      <p class="hist-note">Marca les classes que vols restaurar. Es tornaran a escriure les notes, els alumnes i les activitats amb el contingut del fitxer: <b>els canvis fets després de la còpia es perdran</b>. Abans, es desa una còpia de l'estat actual al núvol (si és possible).</p>
      ${items.map((it, i) => `<label class="hist-row" style="cursor:pointer"><input type="checkbox" data-c="${i}" checked><div class="hr-main"><div class="hr-who" translate="no">${esc(it.nom)}</div><div class="hr-sub"><span translate="no">${Object.keys(it.data.alumnes).length}</span> alumnes</div></div></label>`).join('')}
      <div style="display:flex;gap:.6rem;justify-content:flex-end;margin-top:1rem">
        <button type="button" class="hist-btn" data-r="0">Cancel·la</button>
        <button type="button" class="hist-btn primary" data-r="1">Restaura</button></div>`);
    ov.addEventListener('click', e => {
      const b = e.target.closest('[data-r]'); if (!b) return;
      const sel = [...ov.querySelectorAll('[data-c]')].filter(x => x.checked).map(x => items[+x.dataset.c]);
      closeOverlay(); res(b.dataset.r === '1' ? sel : []);
    });
    $('.hist-x', ov).addEventListener('click', () => res([]));
  });
}

async function restoreFile(file) {
  try {
    const items = parseBackupFile(await file.text());
    if (!items.length) { window.notify?.('El fitxer no conté cap classe'); return; }
    const sel = await chooseClasses(items);
    if (!sel.length) return;
    for (const it of sel) await restoreData(it.classId, it.data, { strictPre: false });
    window.notify?.('Còpia restaurada');
    setTimeout(() => location.reload(), 900);
  } catch (e) { console.error(e); window.notify?.('No s\'ha pogut restaurar: ' + (e.message || e)); }
}

function download(docSnap) {
  const m = docSnap.data();
  const url = URL.createObjectURL(new Blob([m.json], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url;
  a.download = `avaluapp-${(m.nom || 'classe').replace(/[^\w\-]+/g, '_')}-${m.week}.json`;
  a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function confirmRestore(meta) {
  return new Promise(res => {
    const ov = overlay('Restaurar còpia', `
      <p style="font-size:.92rem;color:#231a5c;margin:.8rem 0 .2rem">Vols restaurar aquesta classe a l'estat de la còpia?</p>
      <p style="font-size:.95rem;margin:0 0 .6rem"><b translate="no">${esc(meta.nom)}</b> · <span translate="no">${esc(meta.week)}</span></p>
      <p class="hist-note">Es tornaran a escriure les notes, els alumnes i les activitats d'aquesta classe amb el contingut de la còpia: <b>els canvis fets després d'aquesta còpia es perdran</b>.
      Abans de restaurar es guarda una còpia de l'estat actual, així que es podrà tornar enrere.</p>
      <div style="display:flex;gap:.6rem;justify-content:flex-end;margin-top:1rem">
        <button type="button" class="hist-btn" data-r="0">Cancel·la</button>
        <button type="button" class="hist-btn primary" data-r="1">Restaura</button></div>`);
    ov.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) { closeOverlay(); res(b.dataset.r === '1'); } });
    $('.hist-x', ov).addEventListener('click', () => res(false));
  });
}

/* ---- targeta de Configuració ---- */
async function renderCopies(host) {
  if (!host) return;
  const u = uid();
  host.innerHTML = '<p class="cop-status">Carregant les còpies…</p>';
  if (!u) { host.innerHTML = ''; return; }
  const draw = async () => {
    let snap, denied = false;
    try { snap = await copiesRef(u).orderBy('ts', 'desc').limit(80).get(); }
    catch (e) { denied = e.code === 'permission-denied'; snap = null; console.warn(e); }
    const docs = snap ? snap.docs : [];
    const st = getState(u);
    let head;
    if (denied || (st.denied && !docs.length)) {
      head = '<p class="cop-status warn">Les còpies automàtiques al núvol encara no estan actives: cal desplegar les regles de Firestore actualitzades (fitxer firestore.rules).</p>';
    } else if (docs.length) {
      const last = docs[0].data().ts?.toDate?.();
      head = `<p class="cop-status">Còpia automàtica cada setmana (les «Manuals» són les que fas tu amb el botó). Última còpia: <span translate="no">${last ? fmtDT(last.getTime()) : '—'}</span></p>`;
    } else head = '<p class="cop-status">Encara no hi ha cap còpia. Se\'n crea una de manera automàtica cada setmana.</p>';
    const groups = {};
    const wkNum = w => { const m = /^(\d{4})-W(\d{2})/.exec(w || ''); return m ? `${+m[2]} (${m[1]})` : w; };
    docs.forEach(d => {
      const m = d.data(); const ts = m.ts?.toDate?.();
      const k = m.tipus === 'pre' ? 'Abans de restaurar' : m.tipus === 'manual' ? `Manual · ${ts ? fmtDT(ts.getTime()) : ''}` : `Automàtica · setmana ${wkNum(m.week)}`;
      (groups[k] ||= []).push(d);
    });
    const list = Object.entries(groups).map(([k, ds]) => `<div class="cop-week" translate="no">${esc(k)}</div>` +
      ds.map(d => { const m = d.data(); return `<div class="hist-row"><div class="hr-main"><div class="hr-who" translate="no">${esc(m.nom)}</div><div class="hr-sub"><span translate="no">${m.n ?? '?'}</span> alumnes</div></div>
        <button type="button" class="hist-btn" data-dl="${d.id}">Descarrega</button>
        <button type="button" class="hist-btn danger" data-rs="${d.id}">Restaura</button></div>`; }).join('')).join('');
    host.innerHTML = head + `<button type="button" class="hist-btn primary" id="copNow" style="margin:.2rem 0 .6rem">Fes una còpia ara</button>` + list;
    host._docs = docs;
    $('#copNow', host).addEventListener('click', async ev => {
      const b = ev.currentTarget; b.disabled = true; b.textContent = 'Fent la còpia…';
      try { await makeCopies({ tipus: 'manual', label: weekId() + '-manual' }); setState(u, { denied: false }); window.notify?.('Còpia feta'); }
      catch (e) { window.notify?.('No s\'ha pogut fer la còpia: ' + (e.code === 'permission-denied' ? 'falten les regles de Firestore' : e.message)); }
      draw();
    });
  };
  if (!host._copWired) {
    host._copWired = true;
    host.addEventListener('click', async ev => {
      const byId = id => (host._docs || []).find(d => d.id === id);
      const dl = ev.target.closest('[data-dl]'), rs = ev.target.closest('[data-rs]');
      if (dl) { const d = byId(dl.dataset.dl); if (d) download(d); }
      if (rs) {
        const d = byId(rs.dataset.rs); if (!d) return;
        if (!(await confirmRestore(d.data()))) return;
        try { await restoreCopy(d); window.notify?.('Classe restaurada'); setTimeout(() => location.reload(), 900); }
        catch (e) { console.error(e); window.notify?.('No s\'ha pogut restaurar: ' + e.message); }
      }
    });
  }
  draw();
}

/* ------------------------------------------------------------------ enllaços amb la interfície */
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeOverlay(); });

window.Historial = { renderScreen, renderCopies, restoreFile, makeCopies, ensureWeekly, weekId };
