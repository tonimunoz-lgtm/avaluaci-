// calcModal.js
export function initCalcModal({ getTerms, getActivitiesByTerm }) {
  const modal = document.getElementById('modalCalc');
  const termDropdown = modal.querySelector('#calcTermSelect'); // utilitzem un id nou
  const formulaButtons = modal.querySelector('#formulaButtons');
  const formulaField = modal.querySelector('#formulaField');

  function populateTerms() {
    const terms = getTerms(); // array d'objectes {id, name}
    termDropdown.innerHTML = '';
    if (!terms || terms.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = 'No hi ha graelles';
      opt.disabled = true;
      termDropdown.appendChild(opt);
      formulaButtons.innerHTML = '';
      formulaField.value = '';
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

  function populateActivities(termId) {
    const activities = getActivitiesByTerm(termId);
    formulaButtons.innerHTML = '';
    formulaField.value = '';
    if (!activities) return;

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

  // Quan canviem de terme al desplegable
  termDropdown.addEventListener('change', (e) => {
    const selectedTermId = e.target.value;
    populateActivities(selectedTermId);
  });

  function open() {
    modal.classList.remove('hidden');
    populateTerms();
  }

  function close() {
    modal.classList.add('hidden');
    formulaButtons.innerHTML = '';
    formulaField.value = '';
  }

  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) closeBtn.addEventListener('click', close);

  return { open, close };
}
