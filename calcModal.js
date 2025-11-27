// calcModal.js
export function initCalcModal({ getTerms, getActivitiesByTerm }) {

  const modal = document.getElementById('modalCalc');

  // 🔥 Ara sí: ID correcte!
  const termDropdown = modal.querySelector('#calcTermSelect');

  const formulaButtons = modal.querySelector('#formulaButtons');
  const formulaField = modal.querySelector('#formulaField');

  // Omple el desplegable amb les graelles existents
  function populateTerms() {
    const terms = getTerms(); // array d'objectes {id, name}

    termDropdown.innerHTML = '';

    terms.forEach(term => {
      const option = document.createElement('option');
      option.value = term.id;
      option.textContent = term.name;
      termDropdown.appendChild(option);
    });

    // Si hi ha graelles, carregar activitats de la primera per defecte
    if (terms.length > 0) {
      populateActivities(terms[0].id);
    }
  }

  // Omple els botons d'activitats segons la graella seleccionada
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

  // Quan canviem de graella → canvien les activitats
  termDropdown.addEventListener('change', (e) => {
    populateActivities(e.target.value);
  });

  // Obre el modal
  function open() {
    modal.classList.remove('hidden');
    populateTerms();
  }

  // Tanca el modal
  function close() {
    modal.classList.add('hidden');
    formulaField.value = '';
    formulaButtons.innerHTML = '';
  }

  // Botó de tancar
  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) closeBtn.addEventListener('click', close);

  return { open, close };
}
