import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.window = {};
require('../formula-engine.js');
const F = window.FormulaEngine;
const vals = { a: 6, b: 4, c: '' };
const r = id => vals[id];

test('operacions bàsiques', () => {
  assert.equal(F.evalSafe('__ACT__a*0.5+__ACT__b*0.5', r), 5);
  assert.equal(F.evalSafe('2*(3+4)%5', r), 4);
  assert.equal(F.evalSafe('-(__ACT__a)+10', r), 4);
});
test('funcions permeses', () => {
  assert.equal(F.evalSafe('Math.round(__ACT__a*2)/2', r), 6);
  assert.equal(F.evalSafe('Math.max(__ACT__a,__ACT__b)', r), 6);
});
test('nota buida compta com 0', () => assert.equal(F.evalSafe('__ACT__c+1', r), 1));
test('divisió per zero -> null', () => assert.equal(F.evalSafe('1/0', r), null));
test('no executa codi', () => {
  for (const bad of ['alert(1)', 'process.exit()', 'constructor', 'this', '__proto__', '(1,2)']) {
    assert.equal(F.evalSafe(bad, r), null, bad);
  }
});
test('sintaxi invàlida', () => {
  assert.equal(F.validate('1+').ok, false);
  assert.equal(F.validate('(1+2').ok, false);
  assert.equal(F.validate('2**3').ok, false);
});
