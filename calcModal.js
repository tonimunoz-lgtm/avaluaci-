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
// Render activitats dins modal amb nom i fórmula
// ---------------------------
async function renderActivitiesForTerm(termId) {
  const container = document.getElementById('calcActivitiesContainer');
  if (!container) return;
  container.innerHTML = '';

  if (window.Terms && typeof Terms.getTermActivities === 'function') {
    const actIds = Terms.getTermActivities(termId) || [];

    // Agafem activitats de Firebase si existeix db
    let actsData = [];
    if (window.db) {
      actsData = await Promise.all(
        actIds.map(id => db.collection('activitats').doc(id).get())
      );
    }

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

// ---------------------------
// Obrir modal i omplir desplegable
// ---------------------------
export async function openCalcModal() {
  if (!calcModal) return;
  calcModal.classList.remove('hidden');

  if (!calcTermSelect) return;
  calcTermSelect.innerHTML = '';

  // Espera fins que hi hagi termes carregats
  async function waitForTerms() {
    let terms = [];
    if (window.Terms && typeof Terms.getAllTerms === 'function') {
      terms = Terms.getAllTerms();
    }
    if (!terms || !terms.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return waitForTerms();
    }
    return terms;
  }

  const terms = await waitForTerms();

  terms.forEach(term => {
    const opt = document.createElement('option');
    opt.value = term.id;
    opt.textContent = term.name;
    calcTermSelect.appendChild(opt);
  });

  // Seleccionem terme actiu
  calcTermSelect.value = (window.Terms && typeof Terms.getActiveTermId === 'function') 
    ? Terms.getActiveTermId() 
    : terms[0].id;

  populateFormulaButtons(calcTermSelect.value);
  renderActivitiesForTerm(calcTermSelect.value);

  // Listener: canvi de terme al desplegable
  calcTermSelect.addEventListener('change', () => {
    const termId = calcTermSelect.value;
    if (!termId) return;
    if (window.Terms && typeof Terms.setActiveTerm === 'function') {
      Terms.setActiveTerm(termId);
      populateFormulaButtons(termId);
      renderActivitiesForTerm(termId);
      if (typeof window.renderNotesGrid === 'function') {
        window.renderNotesGrid();
      }
    }
  });

  // Botó tancar modal
  const btnClose = calcModal.querySelector('.close-modal');
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      calcModal.classList.add('hidden');
    });
  }
}

// Exposem globalment per compatibilitat amb el teu app.js
window.openCalcModal = openCalcModal;
