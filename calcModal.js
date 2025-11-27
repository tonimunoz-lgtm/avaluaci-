// calcModal.js
import { getActiveTermId, getActiveTermActivities, _classData } from './terms.js';

// ---------------------------
// Seleccions d'elements
// ---------------------------
const calcModal = document.getElementById('modalCalc');
const calcTermSelect = document.getElementById('calcTermSelect');
const formulaButtons = document.getElementById('formulaButtons');
const formulaField = document.getElementById('formulaField');

// ---------------------------
// Omplir desplegable amb graelles
// ---------------------------
function populateCalcTermSelect() {
  calcTermSelect.innerHTML = '';
  const terms = _classData?.terms || {};
  const termIds = Object.keys(terms);

  if (termIds.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'No hi ha graelles';
    opt.disabled = true;
    calcTermSelect.appendChild(opt);
    return;
  }

  termIds.forEach(id => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = terms[id].name || id;
    calcTermSelect.appendChild(opt);
  });

  const defaultTermId = termIds[0];
  calcTermSelect.value = defaultTermId;
  populateFormulaButtons(defaultTermId);
}

// ---------------------------
// Omplir botons d’activitats
// ---------------------------
function populateFormulaButtons(termId) {
  formulaButtons.innerHTML = '';

  const term = _classData?.terms?.[termId];
  if (!term || !term.activities) return;

  term.activities.forEach(act => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = act;
    btn.className = 'bg-gray-200 px-2 py-1 rounded text-sm hover:bg-gray-300';
    btn.addEventListener('click', () => {
      formulaField.value += act;
    });
    formulaButtons.appendChild(btn);
  });
}

// ---------------------------
// Canvi de graella seleccionada
// ---------------------------
calcTermSelect.addEventListener('change', e => {
  populateFormulaButtons(e.target.value);
});

// ---------------------------
// Obrir modal
// ---------------------------
export function openCalcModal() {
  if (!calcModal || !calcTermSelect) return;

  calcModal.classList.remove('hidden');
  populateCalcTermSelect();

  // Botó tancar modal
  const btnClose = calcModal.querySelector('.close-modal');
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      calcModal.classList.add('hidden');
    });
  }
}

// ---------------------------
// Compatibilitat amb codi antic
// ---------------------------
window.openCalcModal = openCalcModal;
