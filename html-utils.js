// html-utils.js — utilitats globals compartides (carregar ABANS dels altres scripts)
(function () {
  'use strict';

  // Escapa text d'usuari abans d'inserir-lo en innerHTML / atributs HTML
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Crida a /api/tutoria amb el token de l'usuari.
  // `names`: noms reals de l'alumne que NO han de sortir cap a la IA. Es substitueixen
  // per marcadors abans d'enviar i es restauren a la resposta.
  async function aiGenerate(prompt, names) {
    const user = firebase.auth().currentUser;
    const tk = user ? await user.getIdToken() : null;
    if (!tk) throw new Error('Cal iniciar sessió');

    // Construcció de marcadors: nom complet primer, després cada paraula (>=4 lletres)
    const reals = [];
    (names || []).forEach(n => {
      const full = String(n || '').trim();
      if (!full) return;
      reals.push(full);
      full.split(/\s+/).forEach(p => { if (p.length >= 4) reals.push(p); });
    });
    const uniq = [...new Set(reals)].sort((a, b) => b.length - a.length);
    const map = uniq.map((real, i) => ({ real, token: 'ALUMNE' + (i + 1) + 'X' }));

    const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let safePrompt = String(prompt);
    map.forEach(m => { safePrompt = safePrompt.replace(new RegExp(escRe(m.real), 'gi'), m.token); });

    const response = await fetch('/api/tutoria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tk },
      body: JSON.stringify({ prompt: safePrompt })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || ('Error API: ' + response.status));

    let text = data.text || '';
    map.forEach(m => { text = text.split(m.token).join(m.real); });
    return text;
  }


  // Avís no bloquejant (substitueix alert). Errors en vermell, la resta en blau.
  function notify(msg, type) {
    const text = String(msg == null ? '' : msg);
    const isErr = type === 'error' || (!type && /^(⚠|❌|error|no s'ha|no hi ha cap)/i.test(text.trim()));
    let box = document.getElementById('toastBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toastBox';
      box.style.cssText = 'position:fixed;top:16px;right:16px;z-index:100000;display:flex;flex-direction:column;gap:8px;max-width:360px';
      document.body.appendChild(box);
    }
    const t = document.createElement('div');
    t.setAttribute('role', 'status');
    t.style.cssText = 'color:#fff;padding:10px 14px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.3);font-size:14px;white-space:pre-line;cursor:pointer;background:' + (isErr ? '#dc2626' : '#2563eb');
    t.textContent = text;
    t.addEventListener('click', () => t.remove());
    box.appendChild(t);
    setTimeout(() => t.remove(), isErr ? 9000 : 5000);
  }

  // Xarxa de seguretat: errors no capturats -> avís visible + consola
  window.addEventListener('unhandledrejection', e => {
    console.error('Promesa rebutjada:', e.reason);
    notify('⚠️ Error inesperat: ' + ((e.reason && e.reason.message) || e.reason), 'error');
  });
  window.addEventListener('error', e => {
    if (e.message && /ResizeObserver/.test(e.message)) return;
    console.error('Error no capturat:', e.error || e.message);
  });

  window.notify = notify;

  window.esc = esc;
  window.aiGenerate = aiGenerate;
})();
