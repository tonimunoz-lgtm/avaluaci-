import { getActiveTermId, getActiveTermActivities, _classData } from './terms.js';

// ---------------------------
// Funció que només s’executa quan es crida
// ---------------------------
export function openCalcModal() {
  const calcModal = document.getElementById('modalCalc');
  if (!calcModal) return;

  // Mostrem el modal
  calcModal.classList.remove('hidden');

  const calcTermSelect = document.getElementById('calcTermSelect');
  const formulaButtons = document.getElementById('formulaButtons');
  const formulaField = document.getElementById('formulaField');

  if (!calcTermSelect || !formulaButtons || !formulaField) return;

  // Població del select i activitats
  const terms = _classData?.terms || {};
  calcTermSelect.innerHTML = '';
  Object.keys(terms).forEach(id => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = terms[id].name || id;
    calcTermSelect.appendChild(opt);
  });

  // Primer terme per defecte
  if (calcTermSelect.options.length > 0) {
    const defaultTermId = calcTermSelect.options[0].value;
    calcTermSelect.value = defaultTermId;
    populateFormulaButtons(defaultTermId);
  }

  // Event listener del select
  calcTermSelect.addEventListener('change', e => {
    populateFormulaButtons(e.target.value);
  });

  function populateFormulaButtons(termId) {
    formulaButtons.innerHTML = '';
    const term = _classData?.terms?.[termId];
    if (!term || !term.activities) return;
    term.activities.forEach(act => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = act;
      btn.className = 'bg-gray-200 px-2 py-1 rounded text-sm hover:bg-gray-300';
      btn.addEventListener('click', () => formulaField.value += act);
      formulaButtons.appendChild(btn);
    });
  }

  // Botó tancar
  const btnClose = calcModal.querySelector('.close-modal');
  if (btnClose) {
    btnClose.addEventListener('click', () => calcModal.classList.add('hidden'));
  }
}

// Exposem globalment
window.openCalcModal = openCalcModal;
