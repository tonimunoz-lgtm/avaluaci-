// calcModal.js
export function initCalcModal({ getTerms, getActivitiesByTerm }) {
  const modal = document.getElementById('modalCalc');
  const termDropdown = modal.querySelector('#calculatorActivitySelect');
  const formulaButtons = modal.querySelector('#formulaButtons');
  const formulaField = modal.querySelector('#formulaField');

  // Funció per omplir el desplegable de termes
  function populateTerms() {
    const terms = getTerms(); // Esperem un array d'objectes {id, name}
    termDropdown.innerHTML = '';
    terms.forEach(term => {
      const option = document.createElement('option');
      option.value = term.id;
      option.textContent = term.name;
      termDropdown.appendChild(option);
    });
    // Carreguem les activitats del primer terme per defecte
    if (terms.length > 0) {
      populateActivities(terms[0].id);
    }
  }

  // Funció per omplir els botons d'activitats segons el terme
  function populateActivities(termId) {
    const activities = getActivitiesByTerm(termId); // Esperem array d'objectes {id, name}
    formulaButtons.innerHTML = '';
    activities.forEach(act => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = act.name;
      btn.className = 'bg-gray-200 px-2 py-1 rounded hover:bg-gray-300';
      btn.addEventListener('click', () => {
        formulaField.value += `[${act.name}]`; // afegeix l'activitat a la fórmula
      });
      formulaButtons.appendChild(btn);
    });
  }

  // Quan canviem de terme al desplegable
  termDropdown.addEventListener('change', (e) => {
    const selectedTermId = e.target.value;
    populateActivities(selectedTermId);
  });

  // Inicialitzar modal
  function open() {
    modal.classList.remove('hidden');
    populateTerms();
  }

  function close() {
    modal.classList.add('hidden');
    formulaField.value = '';
    formulaButtons.innerHTML = '';
  }

  // Assignar botó de tancament si existeix
  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) closeBtn.addEventListener('click', close);

  return { open, close };
}
