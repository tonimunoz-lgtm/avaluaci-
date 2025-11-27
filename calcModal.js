import { getActiveTermId, getActiveTermActivities, _classData } from './terms.js';

// Seleccions d'elements
const calcModal = document.getElementById('modalCalc');
const calcTermSelect = document.getElementById('calcTermSelect');
const formulaButtons = document.getElementById('formulaButtons');
const formulaField = document.getElementById('formulaField');
const activitiesContainer = document.getElementById('calcActivitiesContainer');

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

// Quan canviem terme al desplegable
calcTermSelect.addEventListener('change', e => {
  populateFormulaButtons(e.target.value);
});

/**
 * Obrir modal de càlcul
 * @param {Object} options - opcions: { getAllTerms, getActiveTermId, setActiveTerm, getTermActivities, renderNotesGrid, db }
 */
export async function openCalcModal(options) {
  const { getAllTerms, getActiveTermId, setActiveTerm, getTermActivities, renderNotesGrid, db } = options;

  if (!calcModal || !calcTermSelect || !activitiesContainer) return;

  calcModal.classList.remove('hidden');

  // Omplir desplegable
  calcTermSelect.innerHTML = '';
  const terms = getAllTerms ? getAllTerms() : [];
  terms.forEach(term => {
    const opt = document.createElement('option');
    opt.value = term.id;
    opt.textContent = term.name;
    calcTermSelect.appendChild(opt);
  });

  const activeTermId = getActiveTermId ? getActiveTermId() : (terms[0]?.id);
  calcTermSelect.value = activeTermId;

  // Render activitats
  await renderActivitiesForTerm(activeTermId, getTermActivities, db);

  // Listener de canvi
  calcTermSelect.addEventListener('change', async () => {
    const termId = calcTermSelect.value;
    if (!termId) return;
    if (setActiveTerm) setActiveTerm(termId);
    await renderActivitiesForTerm(termId, getTermActivities, db);
    if (renderNotesGrid) renderNotesGrid();
  });

  // Botó tancar
  const btnClose = calcModal.querySelector('.close-modal');
  if (btnClose) btnClose.addEventListener('click', () => calcModal.classList.add('hidden'));
}

// Mostrar activitats dins modal
async function renderActivitiesForTerm(termId, getTermActivities, db) {
  activitiesContainer.innerHTML = '';

  if (!getTermActivities || !db) return;

  const actIds = getTermActivities(termId) || [];

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
    activitiesContainer.appendChild(div);
  });

  if (actIds.length === 0) {
    activitiesContainer.innerHTML = '<p class="text-sm text-gray-400">No hi ha activitats per aquest terme.</p>';
  }
}
