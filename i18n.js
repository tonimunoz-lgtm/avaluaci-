// i18n.js — idioma de l'aplicació (ca / es / en).
// El català és l'idioma d'origen: tots els textos del codi estan en català i aquí es tradueixen
// en el moment de pintar-los (text, placeholder, title, aria-label). Per canviar l'idioma es recarrega la pàgina.
// Les dades de l'usuari (noms de classes, alumnes, activitats, períodes) no es toquen: s'ha de marcar translate="no".
export const LANGS = { ca: 'Català', es: 'Castellano', en: 'English' };
const KEY = 'avaluapp.lang';
let lang = 'ca';
try { lang = localStorage.getItem(KEY) || ''; } catch {}
if (!LANGS[lang]) {
  const n = (navigator.language || 'ca').slice(0, 2).toLowerCase();
  lang = LANGS[n] ? n : 'ca';
}
document.documentElement.lang = lang;

let MAP = new Map();      // català → traducció (frases exactes)
let SUBJ = new Map();     // matèries (només dins del generador de comentaris)
let PATS = [];            // [RegExp, plantilla]
const EMOJI_PREFIX = /^([^\p{L}\p{N}«"'(¿¡{[\-–—]+)(.*)$/su;

export const getLang = () => lang;
export function setLang(l) {
  if (!LANGS[l]) return;
  try { localStorage.setItem(KEY, l); } catch {}
}

function lookup(txt, inSubjects) {
  if (inSubjects && SUBJ.has(txt)) return SUBJ.get(txt);
  if (MAP.has(txt)) return MAP.get(txt);
  // «Error guardant: detall» → tradueix només el començament
  const i = txt.indexOf(': ');
  if (i > 3) {
    const head = txt.slice(0, i + 1);
    if (MAP.has(head)) return MAP.get(head) + txt.slice(i + 1);
  }
  for (const [re, tpl] of PATS) {
    const m = txt.match(re);
    if (m) return tpl.replace(/\$(\d)/g, (_, n) => m[+n] ?? '');
  }
  return null;
}
export function tr(s, inSubjects = false) {
  if (lang === 'ca' || typeof s !== 'string') return s;
  const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
  const core = s.trim();
  if (!core) return s;
  let r = lookup(core, inSubjects);
  if (r == null) {
    const m = core.match(EMOJI_PREFIX);
    if (m && m[2]) { const q = lookup(m[2].trim(), inSubjects); if (q != null) r = m[1] + q; }
  }
  return r == null ? s : lead + r + trail;
}
window.t = tr;

const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
const noTr = el => el && el.closest && el.closest('[translate="no"], script, style, textarea, [data-i18n-skip]');
const inSubj = el => !!(el && el.closest && el.closest('#tutoriaModal, #tcModal, .tc-modal'));

function doText(n) {
  const p = n.parentElement;
  if (!p || noTr(p)) return;
  const v = n.nodeValue;
  const r = tr(v, inSubj(p));
  if (r !== v) n.nodeValue = r;
}
function doAttrs(el) {
  if (el.closest && el.closest('[translate="no"], [data-i18n-skip]')) return;
  for (const a of ATTRS) {
    const v = el.getAttribute && el.getAttribute(a);
    if (v) { const r = tr(v); if (r !== v) el.setAttribute(a, r); }
  }
}
function walk(root) {
  if (root.nodeType === 3) return doText(root);
  if (root.nodeType !== 1) return;
  if (noTr(root)) return;
  doAttrs(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) n.nodeType === 3 ? doText(n) : doAttrs(n);
}

async function start() {
  if (lang === 'ca') return;
  try {
    const mod = await import('./i18n-dict.js');
    const idx = lang === 'es' ? 1 : 2;
    MAP = new Map(mod.DICT.map(r => [r[0], r[idx]]));
    SUBJ = new Map(mod.SUBJECTS.map(r => [r[0], r[idx]]));
    PATS = mod.PATTERNS.map(r => [r[0], r[idx]]);
  } catch (e) { console.warn('i18n: no s\'ha pogut carregar el diccionari', e); return; }
  const run = () => {
    walk(document.body);
    new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === 'childList') m.addedNodes.forEach(walk);
        else if (m.type === 'characterData') doText(m.target);
        else if (m.type === 'attributes') doAttrs(m.target);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    document.title = tr(document.title);
  };
  document.body ? run() : document.addEventListener('DOMContentLoaded', run);
  // Diàlegs natius
  const _alert = window.alert.bind(window), _confirm = window.confirm.bind(window), _prompt = window.prompt.bind(window);
  window.alert = m => _alert(tr(String(m)));
  window.confirm = m => _confirm(tr(String(m)));
  window.prompt = (m, d) => _prompt(tr(String(m)), d);
}
await start();
