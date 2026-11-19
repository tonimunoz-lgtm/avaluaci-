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

  window.esc = esc;
  window.aiGenerate = aiGenerate;
})();
