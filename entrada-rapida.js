// entrada-rapida.js — Fase 3: entrada ràpida de notes (pensada per al mòbil)
// Una activitat, un alumne cada vegada, teclat gran i botó «Següent».
//
// No desa res pel seu compte: escriu el valor a la cel·la de la graella i dispara el mateix
// esdeveniment `change` que quan s'escriu la nota a mà. Així es reaprofita el desat existent,
// els recàlculs de les columnes amb fórmula i el «Desfer»/historial de la Fase 2.

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ------------------------------------------------------------------ estils */
(function () {
  const st = document.createElement('style');
  st.textContent = `
  #qeFab { display: none; position: fixed; right: 14px; bottom: 84px; z-index: 9200; border: 0; cursor: pointer;
    align-items: center; gap: .45rem; padding: .8rem 1.1rem; border-radius: 999px; font-weight: 700; font-size: .9rem; color: #fff;
    background: linear-gradient(135deg, #5b3df5, #7c5cff); box-shadow: 0 10px 26px rgba(91,61,245,.45); }
  #qeFab svg { width: 1.15rem; height: 1.15rem; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  @media (max-width: 860px) { #qeFab.show { display: inline-flex; } }

  #qe { position: fixed; inset: 0; z-index: 9300; background: #f6f4ff; display: flex; flex-direction: column;
    font-family: inherit; color: #231a5c; -webkit-user-select: none; user-select: none; }
  #qe .qe-top { display: flex; align-items: center; gap: .6rem; padding: .7rem .8rem; background: #fff; border-bottom: 1px solid #ece9fb; }
  #qe .qe-x { flex: none; width: 2.4rem; height: 2.4rem; border: 0; border-radius: 50%; background: #f1effd; color: #4a2fd4; font-size: 1.1rem; cursor: pointer; }
  #qe .qe-act { flex: 1; min-width: 0; font-size: .95rem; font-weight: 700; padding: .55rem .8rem; border-radius: 999px;
    border: 1.5px solid #d9d3fb; background: #fff; color: #231a5c; }
  #qe .qe-prog { height: 5px; background: #e6e1fb; }
  #qe .qe-prog > i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #5b3df5, #34c38f); transition: width .25s; }
  #qe .qe-meta { display: flex; align-items: center; justify-content: space-between; gap: .6rem; padding: .5rem 1rem 0; font-size: .8rem; color: #7a7799; }
  #qe .qe-chip { border: 1.5px solid #d9d3fb; background: #fff; color: #4a2fd4; border-radius: 999px; padding: .28rem .75rem; font-weight: 700; font-size: .78rem; cursor: pointer; }
  #qe .qe-chip.on { background: #5b3df5; border-color: #5b3df5; color: #fff; }
  #qe .qe-stu { flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .35rem; padding: .4rem 1rem; text-align: center; }
  #qe .qe-stu .stu-avatar { width: 3.4rem; height: 3.4rem; font-size: 1.1rem; }
  #qe .qe-name { font-size: 1.45rem; font-weight: 800; line-height: 1.15; max-width: 100%; overflow-wrap: anywhere; }
  #qe .qe-pos { font-size: .8rem; color: #7a7799; }
  #qe .qe-val { font-size: 4rem; font-weight: 800; line-height: 1; min-height: 4.4rem; color: #4a2fd4; font-variant-numeric: tabular-nums; }
  #qe .qe-val.empty { color: #c9c4ea; }
  #qe .qe-val.old { color: #9d97c9; }
  #qe .qe-hint { font-size: .8rem; color: #7a7799; min-height: 1.1rem; }
  #qe .qe-pad { display: grid; grid-template-columns: repeat(3, 1fr); gap: .55rem; padding: .6rem .8rem; background: #fff; border-top: 1px solid #ece9fb; }
  #qe .qe-key { height: 3.7rem; border: 0; border-radius: 18px; background: #f1effd; color: #231a5c; font-size: 1.6rem; font-weight: 700; cursor: pointer; }
  #qe .qe-key:active { background: #ddd6ff; transform: scale(.97); }
  #qe .qe-key.alt { background: #fff; border: 1.5px solid #e1dcfa; font-size: 1.2rem; color: #4a2fd4; }
  #qe .qe-nav { display: grid; grid-template-columns: 1fr 2fr; gap: .55rem; padding: 0 .8rem calc(.8rem + env(safe-area-inset-bottom)); background: #fff; }
  #qe .qe-btn { height: 3.5rem; border-radius: 18px; border: 1.5px solid #d9d3fb; background: #fff; color: #4a2fd4; font-weight: 800; font-size: 1rem; cursor: pointer; }
  #qe .qe-btn.primary { background: linear-gradient(135deg, #5b3df5, #7c5cff); border: 0; color: #fff; box-shadow: 0 8px 20px rgba(91,61,245,.35); }
  #qe .qe-btn[disabled] { opacity: .4; }
  #qe .qe-done { flex: 1; display: none; flex-direction: column; align-items: center; justify-content: center; gap: .8rem; padding: 2rem; text-align: center; }
  #qe.finished .qe-done { display: flex; }
  #qe.finished .qe-stu, #qe.finished .qe-pad, #qe.finished .qe-nav, #qe.finished .qe-meta { display: none; }
  #qe .qe-done b { font-size: 1.4rem; }
  @media (max-height: 640px) { #qe .qe-val { font-size: 3rem; min-height: 3.2rem; } #qe .qe-key { height: 3rem; } }
  @media (min-width: 861px) { #qe { max-width: 460px; margin: 0 auto; left: 0; right: 0; box-shadow: 0 0 0 100vmax rgba(20,10,60,.45); } }
  `;
  document.head.appendChild(st);
})();

/* ------------------------------------------------------------------ dades de la graella */
const rowsOf = () => Array.from(document.querySelectorAll('#notesTbody tr[data-student-id]'));
const inputOf = (tr, actId) => tr.querySelector(`input.table-input[data-activity-id="${CSS.escape(actId)}"]`);

function editableActivities() {
  const out = [];
  document.querySelectorAll('#notesThead th[data-activity-id]').forEach(th => {
    const id = th.dataset.activityId;
    const ins = rowsOf().map(tr => inputOf(tr, id)).filter(Boolean);
    if (!ins.length) return;
    // només activitats amb nota numèrica editable (no calculades, bloquejades ni competencials)
    if (ins.some(i => i.disabled || i.dataset.isCompetency === 'true' || i.closest('.comp-cell-wrapper') || i.type !== 'number')) return;
    out.push({ id, name: (th.querySelector('.act-name')?.textContent || th.textContent || id).trim() });
  });
  return out;
}

/* ------------------------------------------------------------------ pantalla d'entrada */
let S = null; // estat de la sessió

function open() {
  if (S) return;
  const acts = editableActivities();
  if (!rowsOf().length || !acts.length) {
    window.notify?.('No hi ha cap activitat amb notes numèriques per editar.');
    return;
  }
  const filter = $('#actFilter')?.value;
  const firstPending = acts.find(a => rowsOf().some(tr => (inputOf(tr, a.id)?.value ?? '') === ''));
  S = {
    acts, actId: (acts.find(a => a.id === filter) || firstPending || acts[0]).id,
    onlyPending: false, list: [], i: 0, buf: '', dirty: false
  };
  document.body.classList.add('qe-open');
  const el = document.createElement('div');
  el.id = 'qe'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  el.innerHTML = `
    <div class="qe-top">
      <button type="button" class="qe-x" aria-label="Tanca" title="Tanca">✕</button>
      <select class="qe-act" translate="no" aria-label="Activitat">${acts.map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('')}</select>
    </div>
    <div class="qe-prog"><i></i></div>
    <div class="qe-meta"><span class="qe-count"></span><button type="button" class="qe-chip" data-act="pending">Només pendents</button></div>
    <div class="qe-stu">
      <span class="qe-avatar"></span>
      <div class="qe-name" translate="no"></div>
      <div class="qe-pos"></div>
      <div class="qe-val empty">—</div>
      <div class="qe-hint"></div>
    </div>
    <div class="qe-done"><div style="font-size:3rem">🎉</div><b>Fet!</b><div>Has acabat els alumnes d'aquesta activitat.</div>
      <button type="button" class="qe-btn primary" data-act="close" style="padding:0 2rem">Tanca</button></div>
    <div class="qe-pad">
      ${[7, 8, 9, 4, 5, 6, 1, 2, 3].map(n => `<button type="button" class="qe-key" data-k="${n}">${n}</button>`).join('')}
      <button type="button" class="qe-key alt" data-k="." aria-label="Coma">,</button>
      <button type="button" class="qe-key" data-k="0">0</button>
      <button type="button" class="qe-key alt" data-k="back" aria-label="Esborra" title="Esborra">⌫</button>
    </div>
    <div class="qe-nav">
      <button type="button" class="qe-btn" data-act="prev">← Anterior</button>
      <button type="button" class="qe-btn primary" data-act="next">Desa i següent →</button>
    </div>`;
  document.body.appendChild(el);
  $('.qe-act', el).value = S.actId;
  el.addEventListener('click', onClick);
  $('.qe-act', el).addEventListener('change', e => { commit(); S.actId = e.target.value; rebuild(0); });
  document.addEventListener('keydown', onKey, true);
  rebuild(0);
  fab(false);
}

function close() {
  if (!S) return;
  commit();
  document.removeEventListener('keydown', onKey, true);
  $('#qe')?.remove();
  document.body.classList.remove('qe-open');
  S = null;
  fab();
}

// llista d'alumnes de la sessió (segons l'ordre i el filtre de la graella)
function rebuild(startAt = 0) {
  const trs = rowsOf().filter(tr => tr.style.display !== 'none');
  S.list = trs.filter(tr => !S.onlyPending || (inputOf(tr, S.actId)?.value ?? '') === '');
  $('#qe').classList.remove('finished');
  $('.qe-chip', $('#qe')).classList.toggle('on', S.onlyPending);
  if (!S.list.length) { finish(); return; }
  S.i = Math.min(Math.max(startAt, 0), S.list.length - 1);
  show();
}

function cur() { return S.list[S.i]; }
function origOf(tr) { return inputOf(tr, S.actId)?.value ?? ''; }
const fmt = v => String(v).replace('.', ',');

function show() {
  const tr = cur(), el = $('#qe');
  if (!tr) return;
  S.buf = ''; S.dirty = false;
  const name = (tr.querySelector('.stu-name')?.textContent || '').trim();
  $('.qe-avatar', el).innerHTML = tr.querySelector('.stu-avatar')?.outerHTML || '';
  $('.qe-name', el).textContent = name;
  $('.qe-pos', el).textContent = `${S.i + 1} / ${S.list.length}`;
  $('[data-act=prev]', el).disabled = S.i === 0;
  paint();
  progress();
}

function paint() {
  const el = $('#qe'), v = $('.qe-val', el), tr = cur(), orig = origOf(tr);
  if (S.dirty) {
    v.textContent = S.buf === '' ? '—' : fmt(S.buf);
    v.className = 'qe-val' + (S.buf === '' ? ' empty' : '');
    $('.qe-hint', el).textContent = orig !== '' ? `Nota actual: ${fmt(orig)}` : '';
  } else if (orig !== '') {
    v.textContent = fmt(orig); v.className = 'qe-val old';
    $('.qe-hint', el).textContent = 'Nota actual — escriu-ne una de nova per canviar-la';
  } else {
    v.textContent = '—'; v.className = 'qe-val empty';
    $('.qe-hint', el).textContent = 'Sense nota';
  }
}

function progress() {
  const el = $('#qe');
  const all = rowsOf();
  const done = all.filter(tr => (inputOf(tr, S.actId)?.value ?? '') !== '').length;
  $('.qe-count', el).textContent = `${done}/${all.length} amb nota`;
  $('.qe-prog > i', el).style.width = all.length ? (done / all.length * 100) + '%' : '0';
}

/* ---- teclat ---- */
function press(k) {
  if (!S || $('#qe').classList.contains('finished')) return;
  let b = S.dirty ? S.buf : '';
  if (k === 'back') { b = b.slice(0, -1); }
  else if (k === '.') {
    if (b.includes('.')) return;
    b = (b === '' ? '0' : b) + '.';
  } else {
    const nb = b + k;
    if (b === '0' && k !== '0') b = k;                    // 0 → 7  (no «07»)
    else if (b === '0' && k === '0') return;
    else if (b.includes('.') && b.split('.')[1].length >= 1) return; // un sol decimal
    else if (Number(nb) > 10) { navigator.vibrate?.(30); return; }
    else b = nb;
    if (Number(b) > 10) { navigator.vibrate?.(30); return; }
  }
  S.buf = b; S.dirty = true;
  paint();
}

/* ---- desar i moure's ---- */
function commit() {
  if (!S || !S.dirty) return;
  const tr = cur(); if (!tr) return;
  const inp = inputOf(tr, S.actId);
  if (!inp || inp.disabled) return;
  let val = S.buf.replace(/\.$/, '');
  if (val === inp.value) { S.dirty = false; return; }
  inp.dataset.hPrev = inp.value;   // perquè l'historial/«Desfer» sàpiga el valor anterior
  inp.value = val;
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  inp.dispatchEvent(new Event('change', { bubbles: true }));
  S.dirty = false;
}

function next() {
  if (!S) return;
  commit();
  progress();
  if (S.i + 1 >= S.list.length) { finish(); return; }
  S.i++; show();
}
function prev() { if (!S || S.i === 0) return; commit(); S.i--; show(); }
function finish() { progress(); $('#qe').classList.add('finished'); }

function onClick(e) {
  const k = e.target.closest('[data-k]');
  if (k) { press(k.dataset.k); return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
  if (a.dataset.act === 'next') next();
  else if (a.dataset.act === 'prev') prev();
  else if (a.dataset.act === 'close') close();
  else if (a.dataset.act === 'pending') { commit(); S.onlyPending = !S.onlyPending; rebuild(0); }
  if (e.target.closest('.qe-x')) close();
}

function onKey(e) {
  if (!S || e.target.matches?.('select')) return;
  if (/^[0-9]$/.test(e.key)) { press(e.key); e.preventDefault(); }
  else if (e.key === '.' || e.key === ',') { press('.'); e.preventDefault(); }
  else if (e.key === 'Backspace') { press('back'); e.preventDefault(); }
  else if (e.key === 'Enter') { next(); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') { prev(); e.preventDefault(); }
  else if (e.key === 'ArrowRight') { next(); e.preventDefault(); }
  else if (e.key === 'Escape') { close(); e.preventDefault(); }
}

/* ------------------------------------------------------------------ botó flotant (mòbil) i entrada al menú */
function ensureFab() {
  let f = $('#qeFab');
  if (!f) {
    f = document.createElement('button');
    f.id = 'qeFab'; f.type = 'button';
    f.title = 'Entra les notes d\'una activitat alumne per alumne';
    f.innerHTML = '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg><span>Entrada ràpida</span>';
    f.addEventListener('click', open);
    document.body.appendChild(f);
  }
  return f;
}
function fab(force) {
  const f = ensureFab();
  const visible = force === false ? false :
    !!$('#screen-class') && !$('#screen-class').classList.contains('hidden') &&
    !!$('#notesTbody') && !!$('#notesTbody').querySelector('tr[data-student-id]') && !S;
  f.classList.toggle('show', visible);
}
window.addEventListener('grid-rendered', () => fab());
setInterval(() => fab(), 800);
fab();

document.addEventListener('click', e => {
  if (e.target.closest('.quick-entry-btn')) { $('#termMenu')?.classList.add('hidden'); open(); }
});

window.EntradaRapida = { open, close };
