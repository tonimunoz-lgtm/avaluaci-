// =================== terms.js ===================

// Termes globals
let activeTermId = null;
let currentClassData = null;

// Inicialitzar termes per la classe
export function initTerms(classData){
  currentClassData = classData;
  const dropdown = document.getElementById('termsDropdown');
  dropdown.innerHTML = '';

  const terms = classData.terms || {};
  Object.keys(terms).forEach(termId => {
    const opt = document.createElement('option');
    opt.value = termId;
    opt.textContent = terms[termId].name;
    dropdown.appendChild(opt);
  });

  // Seleccionar primer terme si no n'hi ha actiu
  if(Object.keys(terms).length > 0){
    setActiveTerm(Object.keys(terms)[0]);
  }

  // Canvi terme
  dropdown.addEventListener('change', e => setActiveTerm(e.target.value));
}

// Assignar terme actiu i renderitzar graella
export function setActiveTerm(termId){
  activeTermId = termId;
  document.getElementById('termsDropdown').value = termId;
  renderNotesGridForTerm();
}

// Funció per renderitzar graella segons terme actiu
export function renderNotesGridForTerm(){
  if(!activeTermId || !currentClassData) return;

  const termActivities = currentClassData.terms[activeTermId]?.activities || [];
  
  // Crida a la teva funció existent renderNotesGrid, però amb filtratge
  renderNotesGrid(termActivities); // Modifica renderNotesGrid per acceptar un array d'activitats
}

// Crear un nou terme (botó +)
export async function addNewTerm(){
  const termName = prompt("Introdueix el nom del nou grup d’activitats:");
  if(!termName) return;

  const newTermId = `term_${Date.now()}`;

  try {
    // Guardar al Firestore
    await db.collection('classes').doc(currentClassId).update({
      [`terms.${newTermId}`]: {
        name: termName,
        activities: []
      }
    });

    // Recarregar classData i inicialitzar termes
    const classDoc = await db.collection('classes').doc(currentClassId).get();
    initTerms(classDoc.data());

    // Posar aquest terme com a actiu
    setActiveTerm(newTermId);

  } catch(e) {
    console.error(e);
    alert('Error creant el grup: ' + e.message);
  }
}

// Canviar el nom d'un terme existent
export async function saveActivityChangeToTerm(termId, newName){
  if(!termId || !newName) return;
  try {
    await db.collection('classes').doc(currentClassId).update({
      [`terms.${termId}.name`]: newName
    });

    // Recarregar classData i desplegable
    const classDoc = await db.collection('classes').doc(currentClassId).get();
    initTerms(classDoc.data());

  } catch(e) {
    console.error(e);
    alert('Error canviant nom del grup: ' + e.message);
  }
}
