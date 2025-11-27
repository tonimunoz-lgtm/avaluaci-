// calcModal.js
import { getActiveTermId, getActiveTermActivities, _classData } from './terms.js'; // només _classData per accedir a totes les graelles

// ---------------------------
// Seleccions d'elements
// ---------------------------
const calcModal = document.getElementById('modalCalc');
const calcTermSelect = document.getElementById('calcTermSelect');
const formulaButtons = document.getElementById('formulaButtons');
const formulaField = document.getElementById('formulaField');

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

  // Seleccionem la primera graella per defecte
  const defaultTermId = termIds[0];
  calcTermSelect.value = defaultTermId;
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
      formulaField.value += act; // afegeix activitat al camp de fórmula
    });
    formulaButtons.appendChild(btn);
  });
}

// ---------------------------
// Canvi de graella seleccionada
// ---------------------------
calcTermSelect.addEventListener('change', e => {
  populateFormulaButtons(e.target.value);
});

// ---------------------------
// Obrir modal → omplir desplegable
// ---------------------------
export function openCalcModal() {
  const modal = document.getElementById('modalCalc');
  if (!modal) return;
  modal.classList.remove('hidden');

  // Omplim el desplegable de termes
  const select = document.getElementById('calcTermSelect');
  if (!select) return;
  select.innerHTML = '';

  if (window.Terms) {
    const terms = Terms.getAllTerms(); // Suposant que retorna {id, name}
    terms.forEach(term => {
      const opt = document.createElement('option');
      opt.value = term.id;
      opt.textContent = term.name;
      select.appendChild(opt);
    });
  }

  // Seleccionem terme actiu
  if (Terms.getActiveTermId) {
    select.value = Terms.getActiveTermId();
  }

  // Podeu afegir listeners d’activitats segons terme
}

// Afegim al window per evitar problemes d'import ES Modules amb Firebase
window.openCalcModal = openCalcModal;
