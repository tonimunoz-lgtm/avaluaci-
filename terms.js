// terms.js

// ---------------- Variables globals ----------------
let currentTermName = 'Avaluació'; // Grup inicial per defecte
let classTerms = {}; // Objecte amb tots els grups { 'Avaluació': {...}, 'Exàmens': {...} }

// ---------------- Inicialitzar termes ----------------
async function initTerms(classData) {
  // Carregar termes existents de Firestore
  classTerms = classData.terms || {};

  if (Object.keys(classTerms).length === 0) {
    // Si no hi ha termes, crear un grup inicial amb activitats existents
    classTerms[currentTermName] = { activitats: [...classActivities], calculatedActivities: {} };
    await saveTermsToFirestore();
  }

  renderTermSelector();
  renderTermGrid();
}

// ---------------- Botó "+" per crear un nou grup ----------------
const btnAddTerm = document.getElementById('btnAddTerm');
if (btnAddTerm) {
  btnAddTerm.addEventListener('click', async () => {
    const termName = prompt("Introdueix el nom del nou grup d'activitats:");
    if (!termName) return;

    if (classTerms[termName]) {
      alert('Ja existeix un grup amb aquest nom!');
      return;
    }

    // Crear un nou terme buit (només alumnes, activitats buides)
    classTerms[termName] = { activitats: [], calculatedActivities: {} };
    currentTermName = termName;

    await saveTermsToFirestore();
    renderTermSelector();
    renderTermGrid();
  });
}

// ---------------- Render selector de termes ----------------
function renderTermSelector() {
  const selectorDiv = document.getElementById('termSelector');
  if (!selectorDiv) return;

  selectorDiv.innerHTML = '';

  const select = document.createElement('select');
  select.className = 'border p-1 rounded';

  Object.keys(classTerms).forEach(term => {
    const option = document.createElement('option');
    option.value = term;
    option.textContent = term;
    if (term === currentTermName) option.selected = true;
    select.appendChild(option);
  });

  select.addEventListener('change', e => {
    currentTermName = e.target.value;
    renderTermGrid();
  });

  selectorDiv.appendChild(select);
}

// ---------------- Render graella segons grup ----------------
function renderTermGrid() {
  const termData = classTerms[currentTermName];

  // Assignar activitats i calculatedActivities globals de app.js
  classActivities = termData.activitats || [];
  calculatedActivities = termData.calculatedActivities || {};

  // Actualitzar el títol de la classe amb el nom del terme
  const classTitleEl = document.getElementById('classTitle');
  if (classTitleEl && currentClassId) {
    classTitleEl.textContent = `${currentClassName} - ${currentTermName}`;
  }

  // Cridar funció global per renderitzar graella
  renderNotesGrid();
}

// ---------------- Guardar termes a Firestore ----------------
async function saveTermsToFirestore() {
  if (!currentClassId) return;
  try {
    await db.collection('classes').doc(currentClassId).update({
      terms: classTerms
    });
  } catch (e) {
    console.error('Error guardant grups d’activitats:', e);
    alert('Error guardant grups d’activitats: ' + e.message);
  }
}

// ---------------- Funcions helpers per actualitzar activitats dins del grup ----------------
async function saveActivityChangeToTerm() {
  if (!currentTermName) return;
  classTerms[currentTermName].activitats = [...classActivities];
  classTerms[currentTermName].calculatedActivities = { ...calculatedActivities };
  await saveTermsToFirestore();
}
