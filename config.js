// config.js — pantalla Configuració i preferències de l'usuari.
// Es desen a localStorage (immediat) i al perfil de Firestore (professors/{uid}.config) per seguir-lo entre dispositius.
import { getLang, setLang } from './i18n.js';
const DEFAULTS = {
  nom: '', centre: '', curs: '', signatura: '',
  terms: ['1r trimestre', '2n trimestre', '3r trimestre'],
  th: { red: 5, yellow: 7, green: 9 },
  idioma: 'catala', tutoriaClassId: '', ordreNom: '', escala: '',
  assumpte: 'Notes de {nom}', intro: 'Hola {nom},\n\nAquestes són les teves notes:',
  densitat: 'normal', avisos: true
};
const KEY = 'avaluapp.config';
// Textos per defecte segons l'idioma de l'aplicació (només se substitueixen si l'usuari no els ha personalitzat)
const LOC = {
  ca: { terms: ['1r trimestre', '2n trimestre', '3r trimestre'], assumpte: 'Notes de {nom}', intro: 'Hola {nom},\n\nAquestes són les teves notes:' },
  es: { terms: ['1.er trimestre', '2.º trimestre', '3.er trimestre'], assumpte: 'Notas de {nom}', intro: 'Hola {nom}:\n\nEstas son tus notas:' },
  en: { terms: ['Term 1', 'Term 2', 'Term 3'], assumpte: '{nom}\'s grades', intro: 'Hello {nom},\n\nHere are your grades:' }
};
function localize(c, to) {
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  for (const k of ['terms', 'assumpte', 'intro']) {
    if (Object.values(LOC).some(l => same(l[k], c[k]))) c[k] = LOC[to][k];
  }
  return c;
}
const esc = window.esc || (s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
let cfg = localize(load(), getLang());
function load() {
  try { return merge(DEFAULTS, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { return merge(DEFAULTS, {}); }
}
function merge(a, b) {
  const o = { ...a };
  for (const k in b) o[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) ? { ...(a[k] || {}), ...b[k] } : b[k];
  return o;
}
function apply() {
  document.body.classList.toggle('dens-compact', cfg.densitat === 'compact');
  if (cfg.escala) { // només si l'usuari ja n'ha triat una (si no, es respecta la guardada al navegador)
    document.documentElement.classList.toggle('ui-normal', cfg.escala === 'normal');
    try { localStorage.setItem('avaluapp.escala', cfg.escala === 'normal' ? 'normal' : 'auto'); } catch {}
  }
  window.dispatchEvent(new CustomEvent('avalu-config', { detail: cfg }));
}
async function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch {}
  try {
    const u = firebase.auth().currentUser;
    if (u) await firebase.firestore().collection('professors').doc(u.uid).set({ config: cfg }, { merge: true });
  } catch (e) { console.warn('Config no desada al núvol', e); }
}
const AvaluConfig = {
  get: () => cfg,
  async set(patch) { cfg = merge(cfg, patch); apply(); await persist(); },
  fill: (tpl, vars) => String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m),
  // Primer nom de període predeterminat que encara no existeix a la classe
  nextTermName() {
    const used = new Set((window.AvaluApp?.getTerms?.() || []).map(t => t.name.toLowerCase()));
    return cfg.terms.find(n => !used.has(n.toLowerCase())) || '';
  }
};
window.AvaluConfig = AvaluConfig;
apply();
try {
  firebase.auth().onAuthStateChanged(async u => {
    if (!u) return;
    try {
      const d = await firebase.firestore().collection('professors').doc(u.uid).get();
      if (d.exists && d.data().config) { cfg = merge(DEFAULTS, d.data().config); try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch {} apply(); }
    } catch {}
  });
} catch {}

/* ---------------- pantalla ---------------- */
const msg = t => (window.notify ? window.notify(t) : alert(t));
export function renderConfigScreen(el) {
  const c = cfg;
  const card = (ico, title, body) => `<div class="panel cfg-card"><h3><span class="cfg-ico">${ico}</span>${title}</h3>${body}</div>`;
  const row = (label, input, hint) => `<label class="cfg-row"><span>${label}${hint ? `<small>${hint}</small>` : ''}</span>${input}</label>`;
  el.innerHTML = `
    <h2 class="section-title">Configuració</h2>
    <p class="muted" style="margin:.3rem 0 1rem">Els canvis es desen sols i et segueixen en qualsevol dispositiu.</p>
    <div class="cfg-grid">
    ${card('👤', 'Perfil i centre',
      row('Nom', `<input id="cf_nom" type="text" value="${esc(c.nom)}" placeholder="Toni Muñoz">`) +
      row('Centre', `<input id="cf_centre" type="text" value="${esc(c.centre)}" placeholder="Institut Mata de Pera">`) +
      row('Curs acadèmic', `<input id="cf_curs" type="text" value="${esc(c.curs)}" placeholder="2026-2027">`))}
    ${card('🗓️', 'Períodes per defecte',
      row('Noms proposats', `<input id="cf_terms" type="text" value="${esc(c.terms.join(', '))}">`, 'Separats per comes. Es proposen en crear un període nou.'))}
    ${card('🎯', 'Qualificacions',
      row('Suspès per sota de', `<input id="cf_th_red" type="number" step="0.5" min="0" max="10" value="${c.th.red}">`) +
      row('Groc fins a', `<input id="cf_th_yellow" type="number" step="0.5" min="0" max="10" value="${c.th.yellow}">`) +
      row('Verd fort a partir de', `<input id="cf_th_green" type="number" step="0.5" min="0" max="10" value="${c.th.green}">`, 'Canvia els colors de la graella.'))}
    ${card('🏫', 'Classe de tutoria',
      row('La meva tutoria', `<select id="cf_tut"><option value="">— Cap —</option>${(window.AvaluApp?.getClasses?.() || []).map(k => `<option value="${esc(k.id)}" ${c.tutoriaClassId === k.id ? 'selected' : ''}>${esc(k.nom)}</option>`).join('')}</select>`,
        'Els comentaris i els avisos de comentaris pendents només es calculen per a aquesta classe.'))}
    ${card('🌐', 'Idioma',
      row('Idioma dels comentaris amb IA', `<select id="cf_idioma"><option value="catala" ${c.idioma === 'catala' ? 'selected' : ''}>Català</option><option value="castella" ${c.idioma === 'castella' ? 'selected' : ''}>Castellà</option><option value="angles" ${c.idioma === 'angles' ? 'selected' : ''}>Anglès</option></select>`,
        'Els comentaris generats amb la IA s\'escriuran en aquest idioma per defecte.') +
      row('Idioma de l\'aplicació', `<select id="cf_lang" translate="no"><option value="ca" ${getLang() === 'ca' ? 'selected' : ''}>Català</option><option value="es" ${getLang() === 'es' ? 'selected' : ''}>Castellano</option><option value="en" ${getLang() === 'en' ? 'selected' : ''}>English</option></select>`,
        'Tot el text de l\'aplicació es mostrarà en aquest idioma. La pàgina es recarregarà en canviar-lo.'))}
    ${card('🧭', 'Avaluació competencial', '<div id="cf_comp"></div>')}
    ${card('✉️', 'Correu de notes',
      row('Assumpte', `<input id="cf_assumpte" type="text" value="${esc(c.assumpte)}">`, 'Pots usar {nom} i {classe}.') +
      row('Text d\'inici', `<textarea id="cf_intro" rows="3">${esc(c.intro)}</textarea>`) +
      row('Signatura', `<textarea id="cf_signatura" rows="2" placeholder="Cordialment,&#10;Toni Muñoz">${esc(c.signatura)}</textarea>`))}
    ${card('🎨', 'Aparença i avisos',
      row('Densitat de la graella', `<select id="cf_densitat"><option value="normal" ${c.densitat === 'normal' ? 'selected' : ''}>Còmoda</option><option value="compact" ${c.densitat === 'compact' ? 'selected' : ''}>Compacta</option></select>`) +
      row('Mida de la interfície', `<select id="cf_escala"><option value="auto" ${c.escala !== 'normal' ? 'selected' : ''}>Automàtica (compacta en portàtils)</option><option value="normal" ${c.escala === 'normal' ? 'selected' : ''}>Normal (100%)</option></select>`, 'En pantalles de portàtil es mostra una mica més petita perquè hi càpiga més contingut.') +
      row('Format del nom dels alumnes', `<select id="cf_ordre"><option value="nc" ${(c.ordreNom || localStorage.getItem('uc_nom_order') || 'nc') === 'nc' ? 'selected' : ''}>Nom Cognoms</option><option value="cn" ${(c.ordreNom || localStorage.getItem('uc_nom_order') || 'nc') === 'cn' ? 'selected' : ''}>Cognoms Nom</option></select>`, 'Com surten escrits a la llista. Serveix per separar nom i cognoms als comentaris.') +
      row('Avís de comentaris pendents', `<select id="cf_avisos"><option value="1" ${c.avisos ? 'selected' : ''}>Activat</option><option value="0" ${!c.avisos ? 'selected' : ''}>Desactivat</option></select>`))}
    ${card('🔌', 'Connexions',
      `<p class="muted" style="font-size:.85rem">Compte: <b>${esc(firebase.auth().currentUser?.email || '—')}</b></p>
       <p class="muted" style="font-size:.85rem;margin-top:.4rem">Gmail (enviament de notes) i Google Classroom (importació) demanen permís la primera vegada que els fas servir.</p>`)}
    ${window.__avaluAdmin ? card('⚙️', 'Administració',
      `<p class="muted" style="font-size:.85rem;margin-bottom:.7rem">Gestiona els usuaris i els permisos de l'aplicació.</p>
       <button id="cf_admin" type="button" class="btn">Obrir el panell d'administració</button>`) : ''}
    ${card('💾', 'Dades',
      `<p class="muted" style="font-size:.85rem;margin-bottom:.7rem">Descarrega una còpia de seguretat de totes les teves classes, alumnes i activitats.</p>
       <button id="cf_backup" type="button" class="btn">Descarrega la còpia (JSON)</button>`)}
    </div>`;

  const save = () => {
    const n = id => el.querySelector('#' + id);
    cfg = merge(cfg, {
      nom: n('cf_nom').value.trim(), centre: n('cf_centre').value.trim(), curs: n('cf_curs').value.trim(),
      terms: n('cf_terms').value.split(',').map(s => s.trim()).filter(Boolean),
      th: { red: +n('cf_th_red').value || 5, yellow: +n('cf_th_yellow').value || 7, green: +n('cf_th_green').value || 9 },
      tutoriaClassId: n('cf_tut').value, idioma: n('cf_idioma').value, assumpte: n('cf_assumpte').value, intro: n('cf_intro').value,
      signatura: n('cf_signatura').value, ordreNom: n('cf_ordre').value, escala: n('cf_escala').value, densitat: n('cf_densitat').value, avisos: n('cf_avisos').value === '1'
    });
    try { localStorage.setItem('uc_nom_order', cfg.ordreNom); } catch {}
    const nl = n('cf_lang').value;
    if (nl !== getLang()) {
      cfg = localize(cfg, nl); cfg.lang = nl;
      apply();
      Promise.resolve(persist()).finally(() => { setLang(nl); location.reload(); });
      return;
    }
    apply(); persist(); window.AvaluApp?.refreshPending?.();
  };
  let t; el.querySelectorAll('input, select, textarea').forEach(i => i.addEventListener('input', () => { clearTimeout(t); t = setTimeout(save, 500); }));
  el.querySelector('#cf_backup').addEventListener('click', backup);
  el.querySelector('#cf_admin')?.addEventListener('click', () => { window.location.href = 'administrador.html'; });
  window.CompConfig?.renderInto(el.querySelector('#cf_comp'));
}

async function backup() {
  try {
    const db = firebase.firestore(), u = firebase.auth().currentUser;
    const prof = await db.collection('professors').doc(u.uid).get();
    const out = { exportat: new Date().toISOString(), classes: [] };
    for (const cid of (prof.data().classes || [])) {
      const cd = await db.collection('classes').doc(cid).get(); if (!cd.exists) continue;
      const c = cd.data();
      const alumnes = (await Promise.all((c.alumnes || []).map(id => db.collection('alumnes').doc(id).get()))).filter(d => d.exists).map(d => ({ id: d.id, ...d.data() }));
      const acts = new Set(); Object.values(c.terms || {}).forEach(t => (t.activities || []).forEach(a => acts.add(a)));
      (c.activitats || []).forEach(a => acts.add(a));
      const activitats = (await Promise.all([...acts].map(id => db.collection('activitats').doc(id).get()))).filter(d => d.exists).map(d => ({ id: d.id, ...d.data() }));
      out.classes.push({ id: cid, ...c, alumnesDades: alumnes, activitatsDades: activitats });
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'avaluapp-copia-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (e) { console.error(e); msg('No s\'ha pogut crear la còpia: ' + e.message); }
}
window.AvaluConfig.render = renderConfigScreen;
