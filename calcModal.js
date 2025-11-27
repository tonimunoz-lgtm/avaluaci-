// calcModal.js
import { openModal } from './modals.js';

export function initCalcModal({ getTerms, getActivitiesByTerm }) {
  const modal = document.getElementById('modalCalc');
  const termSelect = document.getElementById('calculatorActivitySelect');
  const formulaButtonsContainer = document.getElementById('formulaButtons');
  const formulaField = document.getElementById('formulaField');

  // Funció que pinta els botons de les activitats dins la fórmula
  function updateFormulaButtons(activities) {
    formulaButtonsContainer.innerHTML = '';
    activities.forEach(act => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'px-2 py-1 bg-gray-200 rounded hover:bg-gray-300';
      btn.textContent = act.name;
      btn.addEventListener('click', () => {
        formulaField.value += act.name; // afegeix el nom al camp fórmula
      });
      formulaButtonsContainer.appendChild(btn);
    });
  }

  // Omplir desplegable amb graelles
  function populateTerms() {
    termSelect.innerHTML = '';
    const terms = getTerms(); // Array de graelles [{id, name}, ...]
    terms.forEach(term => {
      const option = document.createElement('option');
      option.value = term.id;
      option.textContent = term.name;
      termSelect.appendChild(option);
    });

    // Selecciona la primera graella i actualitza botons
    if (terms.length > 0) {
      const firstTermId = terms[0].id;
      termSelect.value = firstTermId;
      const activities = getActivitiesByTerm(firstTermId);
      updateFormulaButtons(activities);
    }
  }

  // Quan canvies de graella
  termSelect.addEventListener('change', () => {
    const termId = termSelect.value;
    const activities = getActivitiesByTerm(termId);
    updateFormulaButtons(activities);
  });

  // Tanca modal
  modal.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  });

  return {
    open: () => {
      populateTerms();
      openModal('modalCalc');
    }
  };
}
