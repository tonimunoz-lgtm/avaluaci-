// calcModal.js
export function initCalcModal({ getTerms, getActivitiesByTerm }) {
  const modal = document.getElementById('modalCalc');
  const termDropdown = modal.querySelector('#calculatorActivitySelect');
  const formulaButtons = modal.querySelector('#formulaButtons');
  const formulaField = modal.querySelector('#formulaField');

  // ------------------ Omplir desplegable de graelles ------------------
  function populateTerms() {
    const terms = getTerms() || []; // Array d'objectes {id, name}
    termDropdown.innerHTML = '';

    if (terms.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = 'Cap graella disponible';
      opt.disabled = true;
      opt.selected = true;
      termDropdown.appendChild(opt);
      formulaButtons.innerHTML = '';
      return;
    }

    terms.forEach(term => {
      const opt = document.createElement('option');
      opt.value = term.id;
      opt.textContent = term.name;
      termDropdown.appendChild(opt);
    });

    // Carregar activitats del primer terme per defecte
    populateActivities(terms[0].id);
  }

  // ------------------ Omplir botons d'activitats ------------------
  function populateActivities(termId) {
    const activities = getActivitiesByTerm(termId) || [];
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

  // ------------------ Canvi de graella ------------------
  termDropdown.addEventListener('change', (e) => {
    const selectedTermId = e.target.value;
    populateActivities(selectedTermId);
  });

  // ------------------ Obrir i tancar modal ------------------
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
