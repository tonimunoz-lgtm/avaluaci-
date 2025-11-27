// calcModal.js

export function initCalcModal({ getTerms, getActivitiesByTerm }) {
  const modal = document.getElementById('modalCalc');
  const calcTypeSelect = document.getElementById('calcType');
  const formulaInputs = document.getElementById('formulaInputs');
  const formulaField = document.getElementById('formulaField');
  const formulaButtons = document.getElementById('formulaButtons');
  const activitySelect = document.getElementById('calculatorActivitySelect');

  // Mostra/Amaga camps segons tipus de càlcul
  calcTypeSelect.addEventListener('change', () => {
    const type = calcTypeSelect.value;
    if (type === 'formula') {
      formulaInputs.classList.remove('hidden');
    } else {
      formulaInputs.classList.add('hidden');
    }
  });

  // Omplir el desplegable amb les graelles
  function populateTermSelect() {
    activitySelect.innerHTML = ''; // netejar abans
    const terms = getTerms(); // array de graelles [{id, name}]
    terms.forEach(term => {
      const opt = document.createElement('option');
      opt.value = term.id;
      opt.textContent = term.name;
      activitySelect.appendChild(opt);
    });
    if (terms.length > 0) populateActivityButtons(terms[0].id);
  }

  // Quan canviem de graella, actualitzem les activitats
  activitySelect.addEventListener('change', () => {
    const termId = activitySelect.value;
    populateActivityButtons(termId);
  });

  // Crear botons de la calculadora segons activitats de la graella
  function populateActivityButtons(termId) {
    formulaButtons.innerHTML = '';
    const activities = getActivitiesByTerm(termId); // array d'activitats [{id, name}]
    activities.forEach(act => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = act.name;
      btn.className = 'bg-gray-200 px-2 py-1 rounded text-sm hover:bg-gray-300';
      btn.addEventListener('click', () => {
        formulaField.value += act.name;
      });
      formulaButtons.appendChild(btn);
    });
  }

  // Inicialitzar modal
  populateTermSelect();

  // Retornem funció pública per re-inicialitzar si canvien graelles
  return {
    refresh: populateTermSelect
  };
}
