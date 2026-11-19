// formula-engine.js — avaluador de fórmules SENSE eval/Function.
// Admet: números, + - * / % , parèntesis, menys unari, __ACT__<id>,
// i funcions Math.round/floor/ceil/abs/min/max/pow/sqrt (també sense "Math.").
// Qualsevol altre símbol dóna error en lloc d'executar codi.
(function () {
  'use strict';

  const FUNCS = {
    round: Math.round, floor: Math.floor, ceil: Math.ceil, abs: Math.abs,
    min: Math.min, max: Math.max, pow: Math.pow, sqrt: Math.sqrt
  };

  function tokenize(src) {
    const out = [];
    let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        const m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i));
        if (!m) throw new Error('Número invàlid a la posició ' + i);
        out.push({ t: 'num', v: parseFloat(m[0]) });
        i += m[0].length; continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        const m = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?/.exec(src.slice(i));
        out.push({ t: 'id', v: m[0] });
        i += m[0].length; continue;
      }
      if ('+-*/%(),'.includes(c)) { out.push({ t: c }); i++; continue; }
      throw new Error('Caràcter no permès: "' + c + '"');
    }
    return out;
  }

  // resolve(id) -> número (per __ACT__...)
  function evaluate(src, resolve) {
    const toks = tokenize(String(src));
    let p = 0;
    const peek = () => toks[p];
    const eat = (t) => { if (!toks[p] || toks[p].t !== t) throw new Error('Se esperava "' + t + '"'); return toks[p++]; };

    function expr() {
      let v = term();
      while (peek() && (peek().t === '+' || peek().t === '-')) {
        const op = toks[p++].t; const r = term();
        v = op === '+' ? v + r : v - r;
      }
      return v;
    }
    function term() {
      let v = unary();
      while (peek() && (peek().t === '*' || peek().t === '/' || peek().t === '%')) {
        const op = toks[p++].t; const r = unary();
        v = op === '*' ? v * r : op === '/' ? v / r : v % r;
      }
      return v;
    }
    function unary() {
      if (peek() && peek().t === '-') { p++; return -unary(); }
      if (peek() && peek().t === '+') { p++; return unary(); }
      return atom();
    }
    function atom() {
      const tk = peek();
      if (!tk) throw new Error('Fórmula incompleta');
      if (tk.t === 'num') { p++; return tk.v; }
      if (tk.t === '(') { p++; const v = expr(); eat(')'); return v; }
      if (tk.t === 'id') {
        p++;
        if (tk.v.startsWith('__ACT__')) {
          const n = Number(resolve ? resolve(tk.v.slice(7)) : 0);
          return isNaN(n) ? 0 : n;
        }
        const name = tk.v.replace(/^Math\./, '');
        if (!Object.prototype.hasOwnProperty.call(FUNCS, name)) throw new Error('Funció no permesa: ' + tk.v);
        eat('(');
        const args = [];
        if (!(peek() && peek().t === ')')) {
          args.push(expr());
          while (peek() && peek().t === ',') { p++; args.push(expr()); }
        }
        eat(')');
        return FUNCS[name](...args);
      }
      throw new Error('Símbol inesperat');
    }

    const v = expr();
    if (p < toks.length) throw new Error('Sobren símbols al final de la fórmula');
    return v;
  }

  // Versió "segura": retorna un número finit o null (mai llença)
  function evalSafe(src, resolve) {
    try {
      const v = evaluate(src, resolve);
      return (typeof v === 'number' && isFinite(v)) ? v : null;
    } catch (e) { return null; }
  }

  function validate(src) {
    try { evaluate(src, () => 1); return { ok: true }; }
    catch (e) { return { ok: false, error: e.message }; }
  }

  window.FormulaEngine = { evaluate, evalSafe, validate };
})();
