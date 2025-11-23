// calcModal.js
import { db } from './firebase.js';
import { classStudents } from './app.js';
import { initNotesGrid } from './notesGrid.js';

let currentCalcActivityId = null;
let currentGrupId = null;

// Elements DOM
const calcTypeSelect = document.getElementById('calcType');
const numericDiv = document.getElementById('numericInput');
const numericField = document.getElementById('numericField');
const formulaDiv = document.getElementById('formulaInputs');
const formulaField = document.getElementById('formulaField');
const formulaButtonsDiv = document.getElementById('formulaButtons');
const modalApplyCalcBtn = document.getElementById('modalApplyCalcBtn');

export function openCalcModal(grupId, activityId) {
  currentGrupId = grupId;
  currentCalcActivityId = activityId;

  // Reset modal
  document.getElementById('calcType').value = 'numeric';
  numericDiv.classList.remove('hidden');
  formulaDiv.classList.add('hidden');
  numericField.value = '';
  formulaField.value = '';

  // Obrir modal (funció externa)
  openModal('modalCalc');
}

// ────────────── Canvi tipus càlcul ──────────────
calcTypeSelect.addEventListener('change', () => {
  const type = calcTypeSelect.value;
  if (type === 'numeric') {
    numericDiv.classList.remove('hidden');
    formulaDiv.classList.add('hidden');
  } else if (type === 'formula') {
    numericDiv.classList.add('hidden');
    formulaDiv.classList.remove('hidden');
    buildFormulaButtons();
  } else if (type === 'rounding') {
    numericDiv.classList.add('hidden');
    formulaDiv.classList.remove('hidden');
    buildRoundingButtons();
  }
});

// ────────────── Aplicar càlcul ──────────────
modalApplyCalcBtn.addEventListener('click', async () => {
  if (!currentCalcActivityId || !currentGrupId) return;

  try {
    switch (calcTypeSelect.value) {
      case 'numeric':
        await applyNumeric(Number(numericField.value));
        break;
      case 'formula':
        await applyFormula(formulaField.value);
        break;
      case 'rounding':
        await applyRounding(formulaField.value);
        break;
    }

    // Recarreguem graella del grup
    await initNotesGrid(currentGrupId);
    closeModal('modalCalc');
  } catch (e) {
    console.error(e);
    alert('Error en aplicar el càlcul: ' + e.message);
  }
});

// ────────────── Helpers ──────────────
async function applyNumeric(val) {
  if (isNaN(val)) throw new Error('Introdueix un número vàlid');
  await Promise.all(classStudents.map(sid => db.collection('alumnes').doc(sid).update({
    [`notes.${currentCalcActivityId}`]: val
  })));
}

async function applyFormula(formula) {
  if (!formula.trim()) throw new Error('Formula buida');

  await Promise.all(classStudents.map(async sid => {
    const result = await evalFormulaAsync(formula, sid);
    await db.collection('alumnes').doc(sid).update({
      [`notes.${currentCalcActivityId}`]: result
    });
  }));
}

async function applyRounding(formula) {
  if (!formula.trim()) throw new Error('Selecciona activitat i 0,5 o 1');

  // Llegim totes les activitats del grup
  const grupDoc = await db.collection('grups').doc(currentGrupId).get();
  if (!grupDoc.exists) throw new Error('Grup no trobat');
  const classActivities = grupDoc.data().activitats || [];

  const activityDocs = await Promise.all(classActivities.map(aid => db.collection('activitats').doc(aid).get()));
  const selectedActivityDoc = activityDocs.find(doc => doc.exists && formula.startsWith(doc.data().nom));
  if (!selectedActivityDoc) throw new Error('Activitat no trobada');

  const selectedActivityId = selectedActivityDoc.id;
  const multiplierStr = formula.slice(selectedActivityDoc.data().nom.length).trim();
  const multiplier = multiplierStr === '' ? 1 : Number(multiplierStr);

  await Promise.all(classStudents.map(async sid => {
    const studentDoc = await db.collection('alumnes').doc(sid).get();
    const notes = studentDoc.exists ? studentDoc.data().notes || {} : {};
    let val = Number(notes[selectedActivityId]) || 0;

    if (multiplier === 1) val = Math.round(val);
    else if (multiplier === 0.5) val = Math.round(val * 2) / 2;

    await db.collection('alumnes').doc(sid).update({
      [`notes.${currentCalcActivityId}`]: val
    });
  }));
}

// ────────────── Construir botons de fórmules ──────────────
function buildFormulaButtons() {
  formulaButtonsDiv.innerHTML = '';

  // Botons activitats del grup
  db.collection('grups').doc(currentGrupId).get().then(grupDoc => {
    const activitats = grupDoc.data().activitats || [];
    activitats.forEach(aid => {
      db.collection('activitats').doc(aid).get().then(actDoc => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'px-2 py-1 m-1 bg-indigo-200 rounded hover:bg-indigo-300';
        btn.textContent = actDoc.exists ? actDoc.data().nom : '???';
        btn.addEv
