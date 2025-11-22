// calculations.js
import { db } from './firebase.js';
import { saveNote } from './notesHelpers.js'; // suposant que tens helpers com saveNote, applyCellColor, etc.

let currentCalcActivityId = null;

// ---------------- Open Calculation Modal ----------------
export function openCalcModal(activityId) {
  currentCalcActivityId = activityId;
  openModal('modalCalc');

  // Reset modal
  const calcType = document.getElementById('calcType');
  const numericDiv = document.getElementById('numericInput');
  const formulaDiv = document.getElementById('formulaInputs');
  const numericField = document.getElementById('numericField');
  const formulaField = document.getElementById('formulaField');

  calcType.value = 'numeric';
  formulaDiv.classList.add('hidden');
  numericDiv.classList.remove('hidden');
  numericField.value = '';
  formulaField.value = '';
}

// ---------------- Change Calc Type ----------------
export function setupCalcTypeListener() {
  const calcType = document.getElementById('calcType');
  calcType.addEventListener('change', () => {
    const numericDiv = document.getElementById('numericInput');
    const formulaDiv = document.getElementById('formulaInputs');
    const formulaButtonsDiv = document.getElementById('formulaButtons');

    switch (calcType.value) {
      case 'numeric':
        numericDiv.classList.remove('hidden');
        formulaDiv.classList.add('hidden');
        break;
      case 'formula':
        numericDiv.classList.add('hidden');
        formulaDiv.classList.remove('hidden');
        buildFormulaButtons(formulaButtonsDiv);
        break;
      case 'rounding':
        numericDiv.classList.add('hidden');
        formulaDiv.classList.remove('hidden');
        buildRoundingButtons(formulaButtonsDiv);
        break;
    }
  });
}

// ---------------- Apply Calculations ----------------
export async function applyNumeric(val, classStudents) {
  if (isNaN(val)) throw new Error('Introdueix un número vàlid');
  await Promise.all(classStudents.map(sid => saveNote(sid, currentCalcActivityId, val)));
}

export async function applyFormula(formula, classStudents, classActivities) {
  if (!formula.trim()) throw new Error('Formula buida');
  await Promise.all(classStudents.map(async sid => {
    const result = await evalFormulaAsync(formula, sid, classActivities);
    await saveNote(sid, currentCalcActivityId, result);
  }));
}

export async function applyRounding(formula, classStudents, classActivities) {
  if (!formula.trim()) throw new Error('Selecciona activitat i 0,5 o 1');

  // Llegim totes les activitats
  const activityDocs = await Promise.all(classActivities.map(aid => db.collection('activitats').doc(aid).get()));
  const selectedActivityDoc = activityDocs.find(doc => doc.exists && formula.startsWith(doc.data().nom));
  if (!selectedActivityDoc) throw new Error('Activitat no trobada');

  const selectedActivityName = selectedActivityDoc.data().nom;
  const multiplier = Number(formula.slice(selectedActivityName.length)) || 1;

  await Promise.all(classStudents.map(async sid => {
    const studentDoc = await db.collection('alumnes').doc(sid).get();
    const notes = studentDoc.exists ? studentDoc.data().notes || {} : {};
    let val = Number(notes[selectedActivityDoc.id]) || 0;

    if (multiplier === 1) val = Math.round(val);
    else if (multiplier === 0.5) val = Math.round(val * 2) / 2;

    await saveNote(sid, currentCalcActivityId, val);
  }));
}

// ---------------- Build Formula Buttons ----------------
export function buildFormulaButtons(container, classActivities) {
  container.innerHTML = '';

  // Activitats
  classActivities.forEach(aid => {
    db.collection('activitats').doc(aid).get().then(doc => {
      const name = doc.exists ? doc.data().nom : '???';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'px-2 py-1 m-1 bg-indigo-200 rounded hover:bg-indigo-300';
      btn.textContent = name;
      btn.addEventListener('click', () => addToFormula(name));
      container.appendChild(btn);
    });
  });

  // Operadors
  ['+', '-', '*', '/', '(', ')'].forEach(op => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'px-2 py-1 m-1 bg-gray-200 rounded hover:bg-gray-300';
    btn.textContent = op;
    btn.addEventListener('click', () => addToFormula(op));
    container.appendChild(btn);
  });

  // Nombres 0-10
  for (let i = 0; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'px-2 py-1 m-1 bg-green-200 rounded hover:bg-green-300';
    btn.textContent = i;
    btn.addEventListener('click', () => addToFormula(i));
    container.appendChild(btn);
  }

  // Decimals
  ['.', ','].forEach(dec => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'px-2 py-1 m-1 bg-yellow-200 rounded hover:bg-yellow-300';
    btn.textContent = dec;
    btn.addEventListener('click', () => addToFormula('.'));
    container.appendChild(btn);
  });

  // Backspace
  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'px-2 py-1 m-1 bg-red-200 rounded hover:bg-red-300';
  backBtn.textContent = '⌫';
  backBtn.addEventListener('click', () => {
    const formulaField = document.getElementById('formulaField');
    formulaField.value = formulaField.value.slice(0, -1);
  });
  container.appendChild(backBtn);
}

// ---------------- Build Rounding Buttons ----------------
export function buildRoundingButtons(container, classActivities) {
  container.innerHTML = '';

  // Activitats
  classActivities.forEach(aid => {
    db.collection('activitats').doc(aid).get().then(doc => {
      const name = doc.exists ? doc.data().nom : '???';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'px-2 py-1 m-1 bg-indigo-200 rounded hover:bg-indigo-300';
      btn.textContent = name;
      btn.addEventListener('click', () => addToFormula(name));
      container.appendChild(btn);
    });
  });

  // 0.5 i 1
  [0.5, 1].forEach(v => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'px-2 py-1 m-1 bg-green-200 rounded hover:bg-green-300';
    btn.textContent = v;
    btn.addEventListener('click', () => addToFormula(v));
    container.appendChild(btn);
  });

  // Backspace
  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'px-2 py-1 m-1 bg-red-200 rounded hover:bg-red-300';
  backBtn.textContent = '⌫';
  backBtn.addEventListener('click', () => {
    const formulaField = document.getElementById('formulaField');
    formulaField.value = formulaField.value.slice(0, -1);
  });
  container.appendChild(backBtn);
}

// ---------------- Add to Formula ----------------
export function addToFormula(str) {
  const formulaField = document.getElementById('formulaField');
  formulaField.value += str;
}

// ---------------- Eval Formula ----------------
export async function evalFormulaAsync(formula, studentId, classActivities) {
  let evalStr = formula;
  const studentDoc = await db.collection('alumnes').doc(studentId).get();
  const notes = studentDoc.exists ? studentDoc.data().notes || {} : {};

  for (const aid of classActivities) {
    const actDoc = await db.collection('activitats').doc(aid).get();
    const actName = actDoc.exists ? actDoc.data().nom : '';
    if (!actName) continue;

    const val = Number(notes[aid]) || 0;
    const regex = new RegExp(actName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    evalStr = evalStr.replace(regex, val);
  }

  try {
    return Function('"use strict"; return (' + evalStr + ')')();
  } catch (e) {
    console.error('Error evaluating formula:', formula, e);
    return 0;
  }
}
