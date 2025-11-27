// calcModal.js
import { getActiveTermId, getActiveTermActivities, _classData } from './terms.js';

// ---------------------------
// Seleccions d'elements
// ---------------------------
const calcModal = document.getElementById('modalCalc');
const calcTermSelect = document.getElementById('calcTermSelect');
const formulaButtons = document.getElementById('formulaButtons');
const formulaField = document.getElementById('formulaField');
const calcActivitiesContainer = document.getElementById('calcActivitiesContainer');

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
  renderActivitiesForTerm(defaultTermId);
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
  const termId = e.target.value;
  populateFormulaButtons(termId);
  renderActivitiesForTerm(termId);
});

// ---------------------------
// Render activitats amb Firebase
// ---------------------------
async function renderActivitiesForTerm(termId) {
  if (!calcActivitiesContainer) return;
  calcActivitiesContainer.innerHTML = '';

  const actIds = getActiveTermActivities(termId) || [];

  if (actIds.length === 0) {
    calcActivitiesContainer.innerHTML = '<p class="text-sm text-gray-400">No hi ha activitats per aquest terme.</p>';
    return;
  }

  try {
    const actsData = await Promise.all(
      actIds.map(id => db.collection('activitats').doc(id).get())
    );

    actsData.forEach(adoc => {
      if (!adoc.exists) return;
      const data = adoc.data();
      const div = document.createElement('div');
      div.className = 'calc-activity p-2 border-b flex justify-between items-center';
      div.innerHTML = `
        <span class="font-medium">${data.nom || 'Sense nom'}</span>
        <span class="text-sm text-gray-500 italic">${data.formula || '-'}</span>
      `;
      calcActivitiesContainer.appendChild(div);
    });
  } catch (error) {
    console.error('Error carregant activitats:', error);
    calcActivitiesContainer.innerHTML = '<p class="text-sm text-red-500">Error carregant activitats.</p>';
  }
}

// ---------------------------
// Obrir modal
// ---------------------------
// calcModal.js
// calcModal.js
export async function openCalcModal() {
  const modal = document.getElementById('modalCalc');
  if (!modal) return;
  modal.classList.remove('hidden');

  const select = document.getElementById('calcTermSelect');
  if (!select) return;
  select.innerHTML = '';

  // Funció per obtenir termes carregats
  async function waitForTerms() {
    let terms = [];
    if (window.Terms && typeof Terms.getAllTerms === 'function') {
      terms = Terms.getAllTerms();
    }
    // Si encara no hi ha termes, esperem 100ms i tornem a provar
    if (!terms || !terms.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return waitForTerms();
    }
    return terms;
  }

  const terms = await waitForTerms();

  // Omplim desplegable
  terms.forEach(term => {
    const opt = document.createElement('option');
    opt.value = term.id;
    opt.textContent = term.name;
    select.appendChild(opt);
  });

  // Seleccionem terme actiu
  select.value = (window.Terms && typeof Terms.getActiveTermId === 'function') ? Terms.getActiveTermId() : terms[0].id;

  // Mostrem activitats del terme actiu
  renderActivitiesForTerm(select.value);

  // Listener: canvi de terme
  select.addEventListener('change', () => {
    const termId = select.value;
    if (!termId) return;
    if (window.Terms && typeof Terms.setActiveTerm === 'function') {
      Terms.setActiveTerm(termId);
      renderActivitiesForTerm(termId);
      if (typeof window.renderNotesGrid === 'function') {
        window.renderNotesGrid();
      }
    }
  });

  // Botó tancar modal
  const btnClose = modal.querySelector('.close-modal');
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }
}


// Funció interna per renderitzar activitats
async function renderActivitiesForTerm(termId) {
  const container = document.getElementById('calcActivitiesContainer');
  if (!container) return;
  container.innerHTML = '';

  if (window.Terms && typeof Terms.getTermActivities === 'function') {
    const actIds = Terms.getTermActivities(termId) || [];
    const actsData = await Promise.all(
      actIds.map(id => db.collection('activitats').doc(id).get())
    );

    actsData.forEach(adoc => {
      if (!adoc.exists) return;
      const data = adoc.data();
      const div = document.createElement('div');
      div.className = 'calc-activity p-2 border-b flex justify-between items-center';
      div.innerHTML = `
        <span class="font-medium">${data.nom || 'Sense nom'}</span>
        <span class="text-sm text-gray-500 italic">${data.formula || '-'}</span>
      `;
      container.appendChild(div);
    });

    if (actIds.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-400">No hi ha activitats per aquest terme.</p>';
    }
  }
}

// Exposem globalment
window.openCalcModal = openCalcModal;


