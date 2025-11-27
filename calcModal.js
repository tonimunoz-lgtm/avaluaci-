// calcModal.js
export function initCalcModal({ getTerms, getActivitiesByTerm }) {

  const modal = document.getElementById('modalCalc');

  // ⛔ AQUEST ID L’HEM DE CANVIAR QUAN EM PASSIS L’HTML
  const termDropdown = modal.querySelector('#calcTermSelect');

  const formulaButtons = modal.querySelector('#formulaButtons');
  const formulaField = modal.querySelector('#formulaField');

  function populateTerms() {
    const terms = getTerms(); 
    termDropdown.innerHTML = '';

    terms.forEach(term => {
      const option = document.createElement('option');
      option.value = term.id; 
      option.textContent = term.name;
      termDropdown.appendChild(option);
    });

    if (terms.length > 0) {
      populateActivities(terms[0].id);
    }
  }

  function populateActivities(termId) {
    const activities = getActivitiesByTerm(termId);
    formulaButtons.innerHTML = '';

    activities.forEach(act => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = act.name;
      btn.className = 'bg-gray-200 px-2 py-1 rounded hover:bg-gray-300';

      btn.addEventListener('click', () => {
        formulaField.value += `[${act.name}]`;
      });

      formulaButtons.appendChild(btn);
    });
  }

  termDropdown.addEventListener('change', (e) => {
    populateActivities(e.target.value);
  });

  function open() {
    modal.classList.remove('hidden');
    populateTerms();
  }

  function close() {
    modal.classList.add('hidden');
    formulaField.value = '';
    formulaButtons.innerHTML = '';
  }

  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) closeBtn.addEventListener('click', close);

  return { open, close };
}
